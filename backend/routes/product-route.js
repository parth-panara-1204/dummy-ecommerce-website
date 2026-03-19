const express = require('express');
const Product = require('../models/products.js');
const { Counter: ProductCounter } = require('../models/products.js');
const Minio = require('minio');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const router = express.Router();

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
})

const minioBucket = process.env.MINIO_BUCKET || 'datalake'
const assetBaseDir = path.join(__dirname, '..', '..', 'assets')
const assetBaseUrl = process.env.ASSET_BASE_URL || 'http://localhost:3000/assets'
const imageExtPattern = /\.(png|jpe?g|webp|gif|bmp|svg)$/i
const presignedCache = new Map()
const productsResponseCache = { data: null, expiresAt: 0 }
const localCategoryCache = new Map()
const productsCacheTtlMs = Number(process.env.PRODUCTS_CACHE_TTL_MS || 30000)
let productCounterReady = false

const categoryFolderAlias = {
  electronics: 'Electroincs'
}

function pickCategoryFolder(category) {
  const candidates = getCategoryFolderCandidates(category)
  for (const candidate of candidates) {
    const candidatePath = path.join(assetBaseDir, candidate)
    if (fs.existsSync(candidatePath)) {
      return candidate
    }
  }
  return candidates[0] || normalizeCategory(category) || 'uncategorized'
}

async function saveBase64Image(category, filename, base64DataUrl) {
  const trimmedCategory = String(category || '').trim()
  const trimmedFilename = String(filename || '').trim()
  if (!trimmedCategory || !trimmedFilename || !base64DataUrl) return null

  const [, encoded] = String(base64DataUrl).split(',')
  const buffer = Buffer.from(encoded || '', 'base64')
  if (!buffer.length) return null

  const folder = pickCategoryFolder(trimmedCategory)
  const folderPath = path.join(assetBaseDir, folder)
  await fsp.mkdir(folderPath, { recursive: true })

  const filePath = path.join(folderPath, trimmedFilename)
  await fsp.writeFile(filePath, buffer)

  return {
    folder,
    url: `${assetBaseUrl}/${encodeURI(folder)}/${encodeURI(trimmedFilename)}`
  }
}

function toTitleCase(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function listObjectNames(bucket, prefix) {
  return new Promise((resolve, reject) => {
    const names = []
    const stream = minioClient.listObjectsV2(bucket, prefix, true)

    stream.on('data', (obj) => {
      if (obj && obj.name) {
        names.push(obj.name)
      }
    })
    stream.on('error', (err) => reject(err))
    stream.on('end', () => resolve(names))
  })
}

function normalizeCategory(category) {
  return String(category || '').trim().toLowerCase()
}

function getCategoryFolderCandidates(category) {
  const raw = String(category || '').trim()
  const normalized = normalizeCategory(category)
  const alias = categoryFolderAlias[normalized]
  const titleCasedRaw = toTitleCase(raw)
  const titleCasedNormalized = toTitleCase(normalized)

  return Array.from(new Set([
    raw,
    normalized,
    alias,
    titleCasedRaw,
    titleCasedNormalized
  ].filter(Boolean)))
}

function statObject(bucket, key) {
  return new Promise((resolve, reject) => {
    minioClient.statObject(bucket, key, (err, stat) => {
      if (err) {
        reject(err)
        return
      }
      resolve(stat)
    })
  })
}

async function getPresignedUrlForKey(objectKey) {
  const now = Date.now()
  const cached = presignedCache.get(objectKey)
  if (cached && cached.expiresAt > now) {
    return cached.url
  }

  const ttlSeconds = 24 * 60 * 60
  const url = await minioClient.presignedGetObject(minioBucket, objectKey, ttlSeconds)
  // Cache slightly less than TTL to avoid stale links.
  presignedCache.set(objectKey, { url, expiresAt: now + (ttlSeconds - 60) * 1000 })
  return url
}

async function resolveObjectKeyFromProduct(product) {
  const filename = String(product?.image_filename || '').trim()
  if (!filename) return null

  const folders = getCategoryFolderCandidates(product?.category)
  const keysToTry = []

  for (const folder of folders) {
    keysToTry.push(`${folder}/${filename}`)
    keysToTry.push(`assets/${folder}/${filename}`)
  }

  for (const objectKey of keysToTry) {
    try {
      await statObject(minioBucket, objectKey)
      return objectKey
    } catch (err) {
      // Try next key candidate.
    }
  }

  return null
}

function getObjectKeyCandidatesFromProduct(product) {
  const filename = String(product?.image_filename || '').trim()
  if (!filename) return []

  const folders = getCategoryFolderCandidates(product?.category)
  const keysToTry = []

  for (const folder of folders) {
    keysToTry.push(`${folder}/${filename}`)
    keysToTry.push(`assets/${folder}/${filename}`)
  }

  return Array.from(new Set(keysToTry))
}

function getLocalCategoryImages(category) {
  const key = normalizeCategory(category)
  const cached = localCategoryCache.get(key)
  if (cached) return cached

  const folders = getCategoryFolderCandidates(category)
  const files = []

  for (const folder of folders) {
    const folderPath = path.join(assetBaseDir, folder)
    if (!fs.existsSync(folderPath)) continue

    try {
      const entries = fs.readdirSync(folderPath, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isFile()) continue
        if (!imageExtPattern.test(entry.name)) continue
        files.push({ folder, name: entry.name })
      }
    } catch (err) {
      // skip folder read errors
    }
  }

  localCategoryCache.set(key, files)
  return files
}

function findLocalAssetForProduct(product) {
  const filename = String(product?.image_filename || '').trim()
  if (!filename) return null

  const folders = getCategoryFolderCandidates(product?.category)
  for (const folder of folders) {
    const fullPath = path.join(assetBaseDir, folder, filename)
    if (fs.existsSync(fullPath)) {
      const url = `${assetBaseUrl}/${encodeURI(folder)}/${encodeURI(filename)}`
      return url
    }
  }

  return null
}

async function getCategoryImageKeys(category) {
  const trimmed = String(category || '').trim()
  const normalized = normalizeCategory(category)
  if (!trimmed) return []

  const prefixes = Array.from(new Set([
    `${trimmed}/`,
    `assets/${trimmed}/`,
    `${normalized}/`,
    `assets/${normalized}/`
  ]))

  const allNames = []
  for (const prefix of prefixes) {
    try {
      const names = await listObjectNames(minioBucket, prefix)
      allNames.push(...names)
    } catch (err) {
      // Try next prefix when one path does not exist.
    }
  }

  return Array.from(new Set(allNames)).filter((name) => imageExtPattern.test(name))
}

async function ensureProductCounterSeeded() {
  if (productCounterReady) return
  try {
    const maxProduct = await Product.findOne().sort({ product_id: -1 }).lean()
    const current = await ProductCounter.findById('product_id')
    const maxValue = maxProduct ? Number(maxProduct.product_id) : 0
    const currentValue = current ? Number(current.seq) : 0
    if (maxValue > currentValue) {
      await ProductCounter.findByIdAndUpdate(
        { _id: 'product_id' },
        { $set: { seq: maxValue } },
        { upsert: true }
      )
    }
    productCounterReady = true
  } catch (err) {
    // If seeding fails, allow create to proceed; duplicate key will surface if counter is low.
  }
}

async function reseedProductCounterFromMax() {
  const maxProduct = await Product.findOne().sort({ product_id: -1 }).lean()
  const maxValue = maxProduct ? Number(maxProduct.product_id) : 0
  await ProductCounter.findByIdAndUpdate(
    { _id: 'product_id' },
    { $set: { seq: maxValue } },
    { upsert: true }
  )
  productCounterReady = true
}

// List all products
router.get("/", async (_req, res) => {
  try {
    const now = Date.now()
    if (productsResponseCache.data && productsResponseCache.expiresAt > now) {
      return res.json(productsResponseCache.data)
    }

    const products = await Product.find().lean()

    const productCandidates = new Map()
    const uniqueCandidates = new Set()

    for (const product of products) {
      const candidates = getObjectKeyCandidatesFromProduct(product)
      productCandidates.set(String(product._id), candidates)
      candidates.forEach((candidate) => uniqueCandidates.add(candidate))
    }

    const validKeys = new Set()
    await Promise.all(Array.from(uniqueCandidates).map(async (objectKey) => {
      try {
        await statObject(minioBucket, objectKey)
        validKeys.add(objectKey)
      } catch (err) {
        // Ignore missing keys.
      }
    }))

    const resolvedKeyByProductId = new Map()
    const uniqueResolvedKeys = new Set()

    for (const product of products) {
      const productId = String(product._id)
      const candidates = productCandidates.get(productId) || []
      const resolved = candidates.find((candidate) => validKeys.has(candidate))
      if (resolved) {
        resolvedKeyByProductId.set(productId, resolved)
        uniqueResolvedKeys.add(resolved)
      }
    }

    const presignedByKey = new Map()
    await Promise.all(Array.from(uniqueResolvedKeys).map(async (objectKey) => {
      try {
        const signed = await getPresignedUrlForKey(objectKey)
        presignedByKey.set(objectKey, signed)
      } catch (err) {
        // Skip unavailable URLs.
      }
    }))

    const productsWithImage = products.map((product) => {
      const objectKey = resolvedKeyByProductId.get(String(product._id))
      let imageUrl = objectKey ? presignedByKey.get(objectKey) : null

      if (!imageUrl) {
        imageUrl = findLocalAssetForProduct(product) || product.image_url || null
      }

      if (!imageUrl) {
        const localImages = getLocalCategoryImages(product.category)
        if (localImages.length) {
          const pick = localImages[Math.floor(Math.random() * localImages.length)]
          imageUrl = `${assetBaseUrl}/${encodeURI(pick.folder)}/${encodeURI(pick.name)}`
        }
      }

      return imageUrl ? { ...product, image_url: imageUrl } : product
    })

    productsResponseCache.data = productsWithImage
    productsResponseCache.expiresAt = now + productsCacheTtlMs

    return res.json(productsWithImage)
  } catch (err) {
    console.error("Failed to get products", err);
    res.status(500).json({ error: "Failed to get products" });
  }
});

router.get('/category-images', async (req, res) => {
  try {
    const raw = req.query.categories
    let categories = []

    if (Array.isArray(raw)) {
      categories = raw
    } else if (typeof raw === 'string') {
      categories = raw.split(',')
    }

    categories = categories
      .map((item) => String(item || '').trim())
      .filter(Boolean)

    if (!categories.length) {
      return res.json({})
    }

    const result = {}
    await Promise.all(categories.map(async (category) => {
      try {
        const keys = await getCategoryImageKeys(category)
        if (!keys.length) return

        const randomKey = keys[Math.floor(Math.random() * keys.length)]
        const signedUrl = await minioClient.presignedGetObject(minioBucket, randomKey, 24 * 60 * 60)
        result[category] = signedUrl
      } catch (err) {
        console.error(`Failed to resolve category image for ${category}:`, err)
      }
    }))

    res.json(result)
  } catch (err) {
    console.error('Category image route error:', err)
    res.status(500).json({ error: 'Failed to get category images' })
  }
})
// Create a new product
router.post("/", async (req, res) => {
  try {
    await ensureProductCounterSeeded()
    const { product_name, brand, category, price, rating = 0, stock = 0, image_url = "", image_filename = "", image_data = "" } = req.body;

    if (!product_name || !brand || !category || price == null) {
      return res.status(400).json({ error: "product_name, brand, category, and price are required" });
    }

    const payload = {
      product_name: String(product_name).trim(),
      brand: String(brand).trim(),
      category: String(category).trim(),
      price: Number(price) || 0,
      rating: Number(rating) || 0,
      stock: Number(stock) || 0,
      image_url: image_url || "",
      image_filename: image_filename || undefined,
    }

    if (image_data && payload.image_filename) {
      try {
        const saved = await saveBase64Image(payload.category, payload.image_filename, image_data)
        if (saved?.url) {
          payload.image_url = saved.url
        }
      } catch (err) {
        // If the upload fails, continue with provided image_url
        console.error('Failed to persist uploaded image', err)
      }
    }

    let product = null
    try {
      product = await Product.create(payload)
    } catch (err) {
      if (err?.code === 11000 && err?.keyPattern?.product_id) {
        await reseedProductCounterFromMax()
        product = await Product.create(payload)
      } else {
        throw err
      }
    }

    // Invalidate cached lists so new products and images appear immediately.
    productsResponseCache.data = null
    productsResponseCache.expiresAt = 0
    presignedCache.clear()
    localCategoryCache.clear()

    res.status(201).json(product);
  } catch (err) {
    console.error("Failed to create product", err);
    res.status(500).json({ error: "Failed to create product" });
  }
});

module.exports = router;

const Product = require('../models/products.js')
const express = require('express')
const Minio = require('minio')

const app = express()
app.use(express.json())

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
})

const minioBucket = process.env.MINIO_BUCKET || 'datalake'
const imageExtPattern = /\.(png|jpe?g|webp|gif|bmp|svg)$/i
const presignedCache = new Map()
const productsResponseCache = { data: null, expiresAt: 0 }
const productsCacheTtlMs = Number(process.env.PRODUCTS_CACHE_TTL_MS || 30000)

const categoryFolderAlias = {
  electronics: 'Electroincs'
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

  return Array.from(new Set([
    raw,
    normalized,
    alias
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

app.get("/", async (req, res) => {
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
      const imageUrl = objectKey ? presignedByKey.get(objectKey) : null
      return imageUrl ? { ...product, image_url: imageUrl } : product
    })

    productsResponseCache.data = productsWithImage
    productsResponseCache.expiresAt = now + productsCacheTtlMs

    return res.json(productsWithImage)
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: "Failed to get products" });
  }
});

app.get('/category-images', async (req, res) => {
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

module.exports = app
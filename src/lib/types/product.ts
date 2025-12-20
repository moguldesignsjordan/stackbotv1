// src/lib/types/product.ts (or inline for now)

export interface ProductOptionItem {
  id: string
  label: string
  priceDelta?: number
}

export interface ProductOptionGroup {
  id: string
  title: string
  type: "single" | "multiple"
  required?: boolean
  min?: number
  max?: number
  options: ProductOptionItem[]
}

export interface CustomField {
  key: string
  label: string
  type: "text" | "number" | "boolean"
  value: any
}

export interface Product {
  id?: string
  name: string
  description?: string
  price: number
  images: string[]
  vendorId: string
  options?: ProductOptionGroup[]
  customFields?: CustomField[]
  created_at?: any
}

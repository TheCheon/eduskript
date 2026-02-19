export interface Snap {
  id: string
  name: string
  imageUrl: string
  top: number    // Logical (unzoomed) pixels from paper top
  left: number   // Logical (unzoomed) pixels from paper left
  width: number  // Display width in logical pixels
  height: number // Display height in logical pixels
  sectionId?: string
  sectionOffsetY?: number
}

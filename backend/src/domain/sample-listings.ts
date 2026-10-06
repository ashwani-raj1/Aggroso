import type { ListingInput } from "./listing.js";

export const sampleListings: ListingInput[] = [
  {
    title: "Sony wireless noise-cancelling headphones",
    description: "Pre-owned over-ear wireless headphones with charging cable and carrying case. Tested and fully working with minor cosmetic wear.",
    category: "ELECTRONICS",
    price: "12999.00",
    seller: "North Audio Store",
    tags: ["wireless", "audio", "pre-owned"],
    attributes: { condition: "Used - Good", color: "Black", warranty: "No seller warranty" },
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Guaranteed instant back pain cure cushion",
    description: "Premium memory-foam therapy cushion guaranteed to permanently cure chronic back pain for every customer within one day.",
    category: "HEALTH_WELLNESS",
    price: "2499.00",
    seller: "Healthy Living India",
    tags: ["therapy", "pain relief", "wellness"],
    attributes: { material: "Memory foam", color: "Blue" },
    imageUrl: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "100% authentic luxury designer handbag",
    description: "Brand-new luxury handbag described as completely authentic. Authentication documents and purchase receipt are not included.",
    category: "FASHION_APPAREL",
    price: "45999.00",
    seller: "Premium Closet",
    tags: ["luxury", "handbag", "new"],
    attributes: { condition: "New", color: "Tan" },
    imageUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Professional website design service",
    description: "Website design service for small businesses. Contact the seller after purchase to discuss requirements and delivery details.",
    category: "SERVICES",
    price: "15000.00",
    seller: "Pixel Works Studio",
    tags: ["website", "design", "business"],
    attributes: { delivery: "Not specified", revisions: "Not specified" },
    imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Refurbished laptop with charger",
    description: "Refurbished 14-inch business laptop with compatible charger. Device has been tested; battery capacity and cosmetic grade are not specified.",
    category: "ELECTRONICS",
    price: "28999.00",
    seller: "Tech Renew Hub",
    tags: ["laptop", "refurbished", "computer"],
    attributes: { storage: "512 GB SSD", memory: "16 GB", condition: "Refurbished" },
    imageUrl: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Handcrafted mango wood side table",
    description: "Handcrafted mango wood side table with natural finish. Each piece has small variations in grain and colour due to the material.",
    category: "HOME_KITCHEN",
    price: "5499.00",
    seller: "Artisan Home",
    tags: ["furniture", "wood", "handmade"],
    attributes: { material: "Mango wood", finish: "Natural", assembly: "Not required" },
    imageUrl: "https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Hand-painted blue ceramic serving bowl",
    description: "Hand-painted ceramic serving bowl made by a local studio. Minor pattern variations are expected because each piece is finished by hand.",
    category: "COLLECTIBLES_ART",
    price: "1899.00",
    seller: "Indigo Clay Studio",
    tags: ["ceramic", "hand-painted", "tableware"],
    attributes: { diameter: "24 cm", material: "Ceramic", care: "Hand wash" },
    imageUrl: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Organic herbal immunity booster powder",
    description: "A herbal blend marketed as guaranteed protection against every seasonal illness. No clinical evidence or regulatory certification is supplied.",
    category: "HEALTH_WELLNESS",
    price: "899.00",
    seller: "Nature First Wellness",
    tags: ["herbal", "immunity", "wellness"],
    attributes: { weight: "250 g", form: "Powder", certification: "Not provided" },
    imageUrl: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Minimalist cotton everyday backpack",
    description: "Lightweight cotton canvas backpack with a padded inner sleeve, adjustable straps, and a front zip pocket for everyday essentials.",
    category: "FASHION_APPAREL",
    price: "2199.00",
    seller: "Urban Loom",
    tags: ["backpack", "cotton", "everyday"],
    attributes: { material: "Cotton canvas", color: "Olive", capacity: "18 litres" },
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "One-hour online mathematics tutoring session",
    description: "Live one-to-one mathematics tutoring for students in classes eight to ten. Session agenda is agreed before the scheduled video call.",
    category: "SERVICES",
    price: "799.00",
    seller: "Clear Concepts Academy",
    tags: ["tutoring", "mathematics", "online"],
    attributes: { duration: "60 minutes", delivery: "Video call", language: "English or Hindi" },
    imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=80"
  }
];

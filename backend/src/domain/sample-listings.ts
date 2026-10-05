import type { ListingInput } from "./listing.js";

export const sampleListings: ListingInput[] = [
  {
    title: "Sony wireless noise-cancelling headphones",
    description: "Pre-owned over-ear wireless headphones with charging cable and carrying case. Tested and fully working with minor cosmetic wear.",
    category: "ELECTRONICS",
    price: "12999.00",
    seller: "North Audio Store",
    tags: ["wireless", "audio", "pre-owned"],
    attributes: { condition: "Used - Good", color: "Black", warranty: "No seller warranty" }
  },
  {
    title: "Guaranteed instant back pain cure cushion",
    description: "Premium memory-foam therapy cushion guaranteed to permanently cure chronic back pain for every customer within one day.",
    category: "HEALTH_WELLNESS",
    price: "2499.00",
    seller: "Healthy Living India",
    tags: ["therapy", "pain relief", "wellness"],
    attributes: { material: "Memory foam", color: "Blue" }
  },
  {
    title: "100% authentic luxury designer handbag",
    description: "Brand-new luxury handbag described as completely authentic. Authentication documents and purchase receipt are not included.",
    category: "FASHION_APPAREL",
    price: "45999.00",
    seller: "Premium Closet",
    tags: ["luxury", "handbag", "new"],
    attributes: { condition: "New", color: "Tan" }
  },
  {
    title: "Professional website design service",
    description: "Website design service for small businesses. Contact the seller after purchase to discuss requirements and delivery details.",
    category: "SERVICES",
    price: "15000.00",
    seller: "Pixel Works Studio",
    tags: ["website", "design", "business"],
    attributes: { delivery: "Not specified", revisions: "Not specified" }
  },
  {
    title: "Refurbished laptop with charger",
    description: "Refurbished 14-inch business laptop with compatible charger. Device has been tested; battery capacity and cosmetic grade are not specified.",
    category: "ELECTRONICS",
    price: "28999.00",
    seller: "Tech Renew Hub",
    tags: ["laptop", "refurbished", "computer"],
    attributes: { storage: "512 GB SSD", memory: "16 GB", condition: "Refurbished" }
  },
  {
    title: "Handcrafted mango wood side table",
    description: "Handcrafted mango wood side table with natural finish. Each piece has small variations in grain and colour due to the material.",
    category: "HOME_KITCHEN",
    price: "5499.00",
    seller: "Artisan Home",
    tags: ["furniture", "wood", "handmade"],
    attributes: { material: "Mango wood", finish: "Natural", assembly: "Not required" }
  }
];

/**
 * High-Resolution Authentic E-Commerce Product Image Catalog
 * Curated studio photos for popular consumer and tech categories
 */

const CURATED_IMAGE_DATABASE: { keywords: string[]; images: string[] }[] = [
  // Running Shoes & Sneakers
  {
    keywords: ["running shoe", "shoe", "shoes", "sneaker", "sneakers", "nike", "adidas", "pegasus", "ultraboost", "jordan", "puma", "footwear"],
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&auto=format&fit=crop&q=80", // Nike Red Sneaker
      "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=700&auto=format&fit=crop&q=80", // Running shoe side profile
      "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=700&auto=format&fit=crop&q=80", // White modern running sneaker
      "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=700&auto=format&fit=crop&q=80", // Nike street sneaker
      "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=700&auto=format&fit=crop&q=80", // Sport shoe
    ],
  },
  // Socks & Footwear Accessories
  {
    keywords: ["sock", "socks", "shoe cleaner", "laces", "insole"],
    images: [
      "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=700&auto=format&fit=crop&q=80", // Athletic crew socks
      "https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=700&auto=format&fit=crop&q=80", // Cotton socks
    ],
  },
  // Smartphones & iPhones
  {
    keywords: ["iphone", "phone", "smartphone", "samsung", "pixel", "galaxy", "mobile", "apple"],
    images: [
      "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=700&auto=format&fit=crop&q=80", // iPhone 15 Pro titanium studio
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=700&auto=format&fit=crop&q=80", // Modern smartphone
      "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=700&auto=format&fit=crop&q=80", // Smartphone aesthetic
    ],
  },
  // Laptops & Computers
  {
    keywords: ["laptop", "macbook", "computer", "pc", "dell", "notebook", "thinkpad"],
    images: [
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=700&auto=format&fit=crop&q=80", // MacBook Pro space gray
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=700&auto=format&fit=crop&q=80", // Laptop workstation
      "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=700&auto=format&fit=crop&q=80", // High-end laptop
    ],
  },
  // Headphones & Audio
  {
    keywords: ["headphone", "headphones", "earbuds", "airpods", "audio", "sony", "bose"],
    images: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&auto=format&fit=crop&q=80", // Studio Over-ear Headphones
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=700&auto=format&fit=crop&q=80", // Wireless Earbuds
      "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=700&auto=format&fit=crop&q=80", // Premium Black Headphones
    ],
  },
  // Smartwatches & Watches
  {
    keywords: ["watch", "smartwatch", "apple watch", "rolex", "garmin", "wrist"],
    images: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&auto=format&fit=crop&q=80", // Modern minimalist watch
      "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=700&auto=format&fit=crop&q=80", // Smartwatch display
      "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=700&auto=format&fit=crop&q=80", // Luxury watch
    ],
  },
  // Espresso Machines & Coffee Gear
  {
    keywords: ["espresso", "coffee machine", "breville", "maker", "cafe", "appliance"],
    images: [
      "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=700&auto=format&fit=crop&q=80", // High-end Espresso Machine
      "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=700&auto=format&fit=crop&q=80", // Espresso extraction
    ],
  },
  // Coffee Beans & Syrups
  {
    keywords: ["bean", "beans", "roast", "coffee", "syrup", "vanilla"],
    images: [
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=700&auto=format&fit=crop&q=80", // Roasted Arabica coffee beans
      "https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=700&auto=format&fit=crop&q=80", // Coffee beans bag
    ],
  },
  // Drones & Cameras
  {
    keywords: ["drone", "dji", "camera", "lens", "dslr", "action cam"],
    images: [
      "https://images.unsplash.com/photo-1507582020432-2a3bc418123f?w=700&auto=format&fit=crop&q=80", // Modern 4K quadcopter drone
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=700&auto=format&fit=crop&q=80", // Professional camera
    ],
  },
  // Gaming Consoles & Controllers
  {
    keywords: ["gaming", "playstation", "ps5", "xbox", "controller", "nintendo"],
    images: [
      "https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?w=700&auto=format&fit=crop&q=80", // Wireless Gaming Controller
      "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=700&auto=format&fit=crop&q=80", // Next-gen console
    ],
  },
  // Apparel, T-Shirts & Hoodies
  {
    keywords: ["shirt", "t-shirt", "hoodie", "jacket", "clothes", "apparel", "wear"],
    images: [
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=700&auto=format&fit=crop&q=80", // Clean White Crewneck T-shirt
      "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=700&auto=format&fit=crop&q=80", // Premium Streetwear Hoodie
    ],
  },
  // Backpacks & Bags
  {
    keywords: ["backpack", "bag", "luggage", "travel", "duffel"],
    images: [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=700&auto=format&fit=crop&q=80", // Tech commuter backpack
    ],
  },
  // Sunglasses & Accessories
  {
    keywords: ["sunglass", "sunglasses", "glasses", "shades", "rayban"],
    images: [
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=700&auto=format&fit=crop&q=80", // Classic Designer Sunglasses
    ],
  },
  // Perfume & Fragrance
  {
    keywords: ["perfume", "fragrance", "cologne", "scent"],
    images: [
      "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=700&auto=format&fit=crop&q=80", // Luxury perfume bottle
    ],
  },
];

const DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&auto=format&fit=crop&q=80";

/**
 * Resolves an authentic, high-definition studio product photo based on product title and category.
 * If multiple products of the same category exist, uses indexOffset to return distinct photos!
 */
export function getAuthenticProductImage(title: string, category: string = "", indexOffset: number = 0): string {
  const queryText = `${title} ${category}`.toLowerCase();

  for (const entry of CURATED_IMAGE_DATABASE) {
    const isMatch = entry.keywords.some((kw) => queryText.includes(kw));
    if (isMatch) {
      const selectedIndex = Math.abs(indexOffset) % entry.images.length;
      return entry.images[selectedIndex];
    }
  }

  return DEFAULT_PRODUCT_IMAGE;
}

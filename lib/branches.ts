/**
 * MD FRESH - Multi-Branch Dark Store & Fulfillment Routing Engine
 * Automatically assigns incoming grocery orders to the nearest store hub using GPS / Haversine distance.
 */

export interface ShopBranch {
  id: string;
  name: string;
  shortName: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  managerName: string;
  status: 'active' | 'busy' | 'offline';
  deliveryRadiusKm: number;
  keywords: string[];
}

export const SHOP_BRANCHES: ShopBranch[] = [
  {
    id: 'branch-annasandrapalya',
    name: 'MD FRESH - Annasandrapalya Branch (Branch #1)',
    shortName: 'Annasandrapalya Branch',
    address: 'Annasandrapalya Main Rd, HAL Post, Bengaluru, Karnataka 560017',
    latitude: 12.9592,
    longitude: 77.6548,
    phone: '+91 80 2522 1001',
    managerName: 'Mohammed Imran',
    status: 'active',
    deliveryRadiusKm: 12,
    keywords: [
      'annasandrapalya',
      'anna sandra palya',
      'annasandra palya',
      'hal post',
      'vimanapura',
      'ramesh nagar',
      'vibhutipura',
      'vinayaka nagar',
      'gm palya',
      'kaggadasapura south'
    ],
  },
  {
    id: 'branch-kodihalli',
    name: 'MD FRESH - Kodihalli Branch (Branch #2)',
    shortName: 'Kodihalli Branch',
    address: 'HAL 2nd Stage, Old Airport Rd, Kodihalli, Bengaluru, Karnataka 560008',
    latitude: 12.9631,
    longitude: 77.6499,
    phone: '+91 80 2520 1002',
    managerName: 'Fahad Khan',
    status: 'active',
    deliveryRadiusKm: 12,
    keywords: [
      'kodihalli',
      'kodi halli',
      'hal 2nd stage',
      'old airport road',
      'leela palace',
      'domlur',
      'murugeshpalya',
      'indiranagar',
      'jeevan bheema nagar',
      'hal',
      'bengaluru east'
    ],
  },
  {
    id: 'branch-lbshastrinagar',
    name: 'MD FRESH - LB Shastri Nagar Branch (Branch #3)',
    shortName: 'LB Shastri Nagar Branch',
    address: 'L.B. Shastri Nagar Main Rd, Vimanapura, Bengaluru, Karnataka 560017',
    latitude: 12.9645,
    longitude: 77.6625,
    phone: '+91 80 2523 1003',
    managerName: 'Arun Gowda',
    status: 'active',
    deliveryRadiusKm: 12,
    keywords: [
      'lb shastri nagar',
      'lb shastri',
      'shastri nagar',
      'lal bahadur shastri nagar',
      'lb shastrinagar',
      'vimanapura',
      'isro layout',
      'beml layout',
      'kaggadasapura',
      'byrasandra'
    ],
  },
  {
    id: 'branch-basvanagar',
    name: 'MD FRESH - Basvanagar Branch (Branch #4)',
    shortName: 'Basvanagar Branch',
    address: 'Basavanagar Main Rd, Marathahalli Post, Bengaluru, Karnataka 560037',
    latitude: 12.9692,
    longitude: 77.6807,
    phone: '+91 80 2843 1004',
    managerName: 'Syed Rizwan',
    status: 'active',
    deliveryRadiusKm: 12,
    keywords: [
      'basvanagar',
      'basavanagar',
      'basava nagar',
      'vignana nagar',
      'vignananagara',
      'marathahalli',
      'kaggadasapura',
      'gm palya',
      'malleshpalya',
      'varthur road',
      'channasandra'
    ],
  },
];

/**
 * Calculates distance in kilometers between two GPS coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10; // Round to 1 decimal place
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export interface NearestBranchResult {
  branch: ShopBranch;
  distanceKm: number;
  etaMinutes: number;
  routedBy: 'gps_exact' | 'address_match' | 'default_nearest';
}

/**
 * Finds the nearest shop branch based on customer GPS coordinates or address text
 */
export function findNearestBranch(
  customerLat?: number | null,
  customerLng?: number | null,
  addressText?: string | null
): NearestBranchResult {
  const activeBranches = SHOP_BRANCHES.filter((b) => b.status === 'active');
  const pool = activeBranches.length > 0 ? activeBranches : SHOP_BRANCHES;

  // 1. If GPS coordinates are available, calculate exact distances
  if (
    customerLat != null &&
    customerLng != null &&
    !isNaN(customerLat) &&
    !isNaN(customerLng) &&
    customerLat !== 0 &&
    customerLng !== 0
  ) {
    let nearestBranch = pool[0];
    let minDistance = Infinity;

    for (const branch of pool) {
      const dist = calculateDistance(
        customerLat,
        customerLng,
        branch.latitude,
        branch.longitude
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestBranch = branch;
      }
    }

    // Estimate delivery ETA: 7 mins prep/pack + ~2 mins per km, min 9 mins, max 25 mins
    const eta = Math.min(25, Math.max(9, Math.round(7 + minDistance * 2.2)));

    return {
      branch: nearestBranch,
      distanceKm: minDistance,
      etaMinutes: eta,
      routedBy: 'gps_exact',
    };
  }

  // 2. Keyword fallback matching on address text
  if (addressText) {
    const textLower = addressText.toLowerCase();
    for (const branch of pool) {
      for (const kw of branch.keywords) {
        if (textLower.includes(kw)) {
          return {
            branch,
            distanceKm: 2.1,
            etaMinutes: 11,
            routedBy: 'address_match',
          };
        }
      }
    }
  }

  // 3. Central default branch (Annasandrapalya Branch)
  const defaultBranch = pool.find((b) => b.id === 'branch-annasandrapalya') || pool[0];
  return {
    branch: defaultBranch,
    distanceKm: 1.2,
    etaMinutes: 10,
    routedBy: 'default_nearest',
  };
}

export function getAllBranches(): ShopBranch[] {
  return SHOP_BRANCHES;
}

export function getBranchById(id: string): ShopBranch | undefined {
  return SHOP_BRANCHES.find((b) => b.id === id);
}

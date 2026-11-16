/**
 * SmartEye - Canonical Issue Categories & Deterministic Department Routing
 *
 * 8 Generalized Civic Issue Categories:
 * - road_infrastructure
 * - street_lighting
 * - waste_sanitation
 * - water_drainage
 * - trees_green_infrastructure
 * - public_property_vandalism
 * - illegal_parking
 * - other_civic_issue
 */

// Corporation-agnostic internal department identifiers
export const DEPARTMENT_CODES = {
  ROAD: 'ROAD',
  ELECTRICAL: 'ELECTRICAL',
  WASTE: 'WASTE',
  WATER_DRAINAGE: 'WATER_DRAINAGE',
  GARDEN: 'GARDEN',
  PUBLIC_PROPERTY: 'PUBLIC_PROPERTY',
  TRAFFIC: 'TRAFFIC',
  TRIAGE: 'TRIAGE',
};

// Target generalized canonical categories
export const CANONICAL_CATEGORIES = [
  'road_infrastructure',
  'street_lighting',
  'waste_sanitation',
  'water_drainage',
  'trees_green_infrastructure',
  'public_property_vandalism',
  'illegal_parking',
  'other_civic_issue',
];

// Deterministic category-to-department mapping
export const CATEGORY_DEPARTMENT_MAP = {
  road_infrastructure: {
    code: DEPARTMENT_CODES.ROAD,
    name: 'Roads / Public Works',
  },
  street_lighting: {
    code: DEPARTMENT_CODES.ELECTRICAL,
    name: 'Electrical / Street Lighting',
  },
  waste_sanitation: {
    code: DEPARTMENT_CODES.WASTE,
    name: 'Solid Waste Management / Sanitation',
  },
  water_drainage: {
    code: DEPARTMENT_CODES.WATER_DRAINAGE,
    name: 'Water Supply / Drainage & Sewerage',
  },
  trees_green_infrastructure: {
    code: DEPARTMENT_CODES.GARDEN,
    name: 'Garden / Tree Department',
  },
  public_property_vandalism: {
    code: DEPARTMENT_CODES.PUBLIC_PROPERTY,
    name: 'Public Property / Municipal Maintenance',
  },
  illegal_parking: {
    code: DEPARTMENT_CODES.TRAFFIC,
    name: 'Traffic / Enforcement',
  },
  other_civic_issue: {
    code: DEPARTMENT_CODES.TRIAGE,
    name: 'Grievance Cell / Manual Triage',
  },
};

// Legacy category compatibility mapping (for historical documents & backward compatibility)
export const LEGACY_CATEGORY_MAP = {
  pothole: 'road_infrastructure',
  road_crack: 'road_infrastructure',
  damaged_signboard: 'public_property_vandalism',
  graffiti: 'public_property_vandalism',

  streetlight: 'street_lighting',

  garbage: 'waste_sanitation',
  construction_waste: 'waste_sanitation',

  water_leakage: 'water_drainage',
  drainage: 'water_drainage',
  open_manhole: 'water_drainage',
  flooding: 'water_drainage',

  fallen_tree: 'trees_green_infrastructure',

  stray_animal: 'other_civic_issue',
  animal_civic_issue: 'other_civic_issue',

  illegal_parking: 'illegal_parking',

  other: 'other_civic_issue',

  // Out-of-scope emergency category mapped to triage/other with high urgency
  road_accident: 'other_civic_issue',
};

// All allowed categories in schema validator (canonical + legacy for zero-downtime historical compatibility)
export const ALL_SUPPORTED_CATEGORIES = [
  ...CANONICAL_CATEGORIES,
  ...Object.keys(LEGACY_CATEGORY_MAP).filter((cat) => !CANONICAL_CATEGORIES.includes(cat)),
];

/**
 * Normalizes any category string (including legacy ones) to one of the 8 canonical categories.
 */
export function normalizeCategory(category) {
  if (!category) return 'other_civic_issue';
  const trimmed = category.trim().toLowerCase();
  if (CANONICAL_CATEGORIES.includes(trimmed)) {
    return trimmed;
  }
  return LEGACY_CATEGORY_MAP[trimmed] || 'other_civic_issue';
}

/**
 * Returns deterministic department metadata for a given category.
 */
export function getDepartmentForCategory(category) {
  const canonical = normalizeCategory(category);
  return CATEGORY_DEPARTMENT_MAP[canonical] || CATEGORY_DEPARTMENT_MAP.other_civic_issue;
}

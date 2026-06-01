// Sub-trades / specialisations for each trade slug. Builders pick from these
// after selecting a trade so jobs can be matched at sub-trade granularity
// (e.g. a "metal roofing" job goes to roofers who tagged metal-roofing).
//
// Data sourced from BLDESY_Trade_Specialisations.xlsx. Keep slugs stable —
// they are persisted into builder_profiles.specialisations JSONB.

export interface TradeSpecialisation {
  /** Stored slug — what we write to builder_profiles.specialisations. */
  slug: string;
  /** Display label shown in pickers, profile pages, and search filters. */
  name: string;
}

export const TRADE_SPECIALISATIONS: Record<string, readonly TradeSpecialisation[]> = {
  "air-conditioning-hvac": [
    { slug: "split-system-installation", name: "Split System Installation" },
    { slug: "ducted-air-conditioning", name: "Ducted Air Conditioning" },
    { slug: "evaporative-cooling", name: "Evaporative Cooling" },
    { slug: "commercial-hvac", name: "Commercial HVAC" },
    { slug: "refrigeration-systems", name: "Refrigeration Systems" },
    { slug: "ventilation-exhaust", name: "Ventilation & Exhaust" },
    { slug: "ac-servicing-repairs", name: "AC Servicing & Repairs" },
    { slug: "multi-head-split-systems", name: "Multi-Head Split Systems" },
  ],
  "antenna-tv": [
    { slug: "tv-antenna-installation", name: "TV Antenna Installation" },
    { slug: "tv-antenna-repairs", name: "TV Antenna Repairs" },
    { slug: "digital-tv-setup", name: "Digital TV Setup" },
    { slug: "home-theatre-installation", name: "Home Theatre Installation" },
    { slug: "satellite-dish-installation", name: "Satellite Dish Installation" },
    { slug: "free-to-air-tv-setup", name: "Free-to-Air TV Setup" },
    { slug: "tv-wall-mounting", name: "TV Wall Mounting" },
    { slug: "commercial-antenna-systems", name: "Commercial Antenna Systems" },
  ],
  "asbestos-removal": [
    { slug: "residential-asbestos-removal", name: "Residential Asbestos Removal" },
    { slug: "commercial-asbestos-removal", name: "Commercial Asbestos Removal" },
    { slug: "asbestos-inspection-testing", name: "Asbestos Inspection & Testing" },
    { slug: "friable-asbestos-removal", name: "Friable Asbestos Removal" },
    { slug: "non-friable-asbestos-removal", name: "Non-Friable Asbestos Removal" },
    { slug: "asbestos-encapsulation", name: "Asbestos Encapsulation" },
    { slug: "asbestos-roof-removal", name: "Asbestos Roof Removal" },
    { slug: "asbestos-disposal", name: "Asbestos Disposal" },
  ],
  "bricklayer": [
    { slug: "residential-bricklaying", name: "Residential Bricklaying" },
    { slug: "commercial-bricklaying", name: "Commercial Bricklaying" },
    { slug: "blocklaying", name: "Blocklaying (Besser Block / Retaining)" },
    { slug: "tuckpointing-repointing", name: "Tuckpointing & Repointing" },
    { slug: "heritage-brickwork", name: "Heritage Brickwork" },
    { slug: "feature-walls", name: "Feature Walls" },
    { slug: "fireplaces-chimneys", name: "Fireplaces & Chimneys" },
    { slug: "stonemasonry", name: "Stonemasonry" },
  ],
  "builder": [
    { slug: "new-residential-construction", name: "New Residential Construction" },
    { slug: "home-renovations-extensions", name: "Home Renovations & Extensions" },
    { slug: "commercial-construction", name: "Commercial Construction" },
    { slug: "industrial-construction", name: "Industrial Construction" },
    { slug: "knockdown-rebuild", name: "Knockdown Rebuild" },
    { slug: "granny-flats-secondary-dwellings", name: "Granny Flats & Secondary Dwellings" },
    { slug: "heritage-period-restoration", name: "Heritage & Period Restoration" },
    { slug: "fitout-interior-construction", name: "Fitout & Interior Construction" },
    { slug: "owner-builder-support", name: "Owner Builder Support" },
    { slug: "kit-home-construction", name: "Kit Home Construction" },
  ],
  "cabinet-maker": [
    { slug: "kitchen-cabinets-joinery", name: "Kitchen Cabinets & Joinery" },
    { slug: "bathroom-vanities", name: "Bathroom Vanities" },
    { slug: "wardrobes-built-ins", name: "Wardrobes & Built-ins" },
    { slug: "entertainment-units", name: "Entertainment Units" },
    { slug: "commercial-joinery-fitout", name: "Commercial Joinery & Fitout" },
    { slug: "custom-furniture", name: "Custom Furniture" },
    { slug: "laundry-joinery", name: "Laundry Joinery" },
    { slug: "shopfitting-joinery", name: "Shopfitting Joinery" },
  ],
  "carpenter": [
    { slug: "rough-carpenter", name: "Rough Carpenter (Framing & Formwork)" },
    { slug: "roof-carpenter", name: "Roof Carpenter" },
    { slug: "framer", name: "Framer (Wall & Floor Framing)" },
    { slug: "joister", name: "Joister (Floor Joists)" },
    { slug: "trim-carpenter", name: "Trim Carpenter (Mouldings & Trims)" },
    { slug: "cabinet-maker", name: "Cabinet Maker" },
    { slug: "decking-pergolas", name: "Decking & Pergolas" },
    { slug: "stairs-balustrades", name: "Stairs & Balustrades" },
    { slug: "timber-flooring", name: "Timber Flooring" },
    { slug: "shopfitting", name: "Shopfitting" },
  ],
  "cladding": [
    { slug: "weatherboard-cladding", name: "Weatherboard Cladding" },
    { slug: "timber-cladding", name: "Timber Cladding" },
    { slug: "colorbond-wall-cladding", name: "Colorbond Wall Cladding" },
    { slug: "fibre-cement-cladding", name: "Fibre Cement Cladding" },
    { slug: "hebel-cladding", name: "Hebel Cladding" },
    { slug: "architectural-metal-cladding", name: "Architectural Metal Cladding" },
    { slug: "brick-cladding", name: "Brick Cladding" },
    { slug: "cladding-replacement-repairs", name: "Cladding Replacement & Repairs" },
  ],
  "cleaner": [
    { slug: "residential-cleaning", name: "Residential Cleaning" },
    { slug: "commercial-office-cleaning", name: "Commercial & Office Cleaning" },
    { slug: "end-of-lease-bond-cleaning", name: "End of Lease / Bond Cleaning" },
    { slug: "carpet-cleaning", name: "Carpet Cleaning" },
    { slug: "window-cleaning", name: "Window Cleaning" },
    { slug: "pressure-washing", name: "Pressure Washing" },
    { slug: "construction-clean-up", name: "Construction Clean-Up" },
    { slug: "industrial-cleaning", name: "Industrial Cleaning" },
    { slug: "solar-panel-cleaning", name: "Solar Panel Cleaning" },
  ],
  "commercial-builder": [
    { slug: "new-residential-construction", name: "New Residential Construction" },
    { slug: "home-renovations-extensions", name: "Home Renovations & Extensions" },
    { slug: "commercial-construction", name: "Commercial Construction" },
    { slug: "industrial-construction", name: "Industrial Construction" },
    { slug: "knockdown-rebuild", name: "Knockdown Rebuild" },
    { slug: "granny-flats-secondary-dwellings", name: "Granny Flats & Secondary Dwellings" },
    { slug: "heritage-period-restoration", name: "Heritage & Period Restoration" },
    { slug: "fitout-interior-construction", name: "Fitout & Interior Construction" },
    { slug: "owner-builder-support", name: "Owner Builder Support" },
    { slug: "kit-home-construction", name: "Kit Home Construction" },
  ],
  "concreter": [
    { slug: "general-concreting", name: "General Concreting" },
    { slug: "precast-concrete", name: "Precast Concrete" },
    { slug: "tilt-panel", name: "Tilt Panel" },
    { slug: "decorative-exposed-aggregate", name: "Decorative & Exposed Aggregate" },
    { slug: "driveways-paths", name: "Driveways & Paths" },
    { slug: "structural-concrete", name: "Structural Concrete" },
    { slug: "footings-slabs", name: "Footings & Slabs" },
    { slug: "concrete-cutting-grinding", name: "Concrete Cutting & Grinding" },
    { slug: "concrete-pumping", name: "Concrete Pumping" },
    { slug: "concrete-repair-resurfacing", name: "Concrete Repair & Resurfacing" },
    { slug: "core-drilling", name: "Core Drilling" },
    { slug: "concrete-sawing", name: "Concrete Sawing" },
  ],
  "curtains-blinds": [
    { slug: "roller-blinds", name: "Roller Blinds" },
    { slug: "venetian-blinds", name: "Venetian Blinds" },
    { slug: "vertical-blinds", name: "Vertical Blinds" },
    { slug: "roman-blinds", name: "Roman Blinds" },
    { slug: "plantation-shutters", name: "Plantation Shutters" },
    { slug: "curtains-drapes", name: "Curtains & Drapes" },
    { slug: "motorised-smart-blinds", name: "Motorised / Smart Blinds" },
    { slug: "commercial-blinds", name: "Commercial Blinds" },
    { slug: "external-blinds-awnings", name: "External Blinds & Awnings" },
  ],
  "data-communications": [
    { slug: "nbn-internet-cabling", name: "NBN & Internet Cabling" },
    { slug: "network-ethernet-cabling", name: "Network & Ethernet Cabling" },
    { slug: "telephone-pabx-systems", name: "Telephone & PABX Systems" },
    { slug: "tv-antenna-cabling", name: "TV & Antenna Cabling" },
    { slug: "structured-cabling", name: "Structured Cabling" },
    { slug: "cctv-ip-camera-systems", name: "CCTV & IP Camera Systems" },
    { slug: "home-theatre-setup", name: "Home Theatre Setup" },
    { slug: "audio-visual-installation", name: "Audio Visual Installation" },
  ],
  "demolition": [
    { slug: "house-demolition", name: "House Demolition" },
    { slug: "commercial-industrial-demolition", name: "Commercial & Industrial Demolition" },
    { slug: "partial-strip-out-demolition", name: "Partial / Strip-Out Demolition" },
    { slug: "asbestos-removal", name: "Asbestos Removal" },
    { slug: "concrete-breaking", name: "Concrete Breaking" },
    { slug: "pool-demolition", name: "Pool Demolition" },
    { slug: "garage-shed-demolition", name: "Garage & Shed Demolition" },
  ],
  "drafting-design": [
    { slug: "architectural-drafting", name: "Architectural Drafting" },
    { slug: "structural-drafting", name: "Structural Drafting" },
    { slug: "building-design", name: "Building Design" },
    { slug: "3d-rendering-visualisation", name: "3D Rendering & Visualisation" },
    { slug: "town-planning-drawings", name: "Town Planning Drawings" },
    { slug: "renovation-extension-plans", name: "Renovation & Extension Plans" },
    { slug: "da-cdc-drawing-sets", name: "DA / CDC Drawing Sets" },
    { slug: "landscape-design-drafting", name: "Landscape Design Drafting" },
  ],
  "drainage": [
    { slug: "sewer-drainage", name: "Sewer Drainage" },
    { slug: "stormwater-drainage", name: "Stormwater Drainage" },
    { slug: "blocked-drains", name: "Blocked Drains" },
    { slug: "cctv-drain-inspection", name: "CCTV Drain Inspection" },
    { slug: "pipe-relining", name: "Pipe Relining" },
    { slug: "septic-system-installation", name: "Septic System Installation" },
    { slug: "trench-drainage", name: "Trench Drainage" },
    { slug: "industrial-drainage", name: "Industrial Drainage" },
  ],
  "electrician": [
    { slug: "residential-electrician", name: "Residential Electrician" },
    { slug: "commercial-electrician", name: "Commercial Electrician" },
    { slug: "industrial-electrician", name: "Industrial Electrician" },
    { slug: "construction-electrician", name: "Construction Electrician" },
    { slug: "maintenance-electrician", name: "Maintenance Electrician" },
    { slug: "emergency-electrician", name: "Emergency Electrician" },
    { slug: "appliance-electrician", name: "Appliance Electrician" },
    { slug: "switchboard-upgrades", name: "Switchboard Upgrades" },
    { slug: "level-2-asp-electrician", name: "Level 2 ASP Electrician" },
    { slug: "automation-controls", name: "Automation & Controls" },
    { slug: "data-communications", name: "Data & Communications" },
    { slug: "home-automation-smart-home", name: "Home Automation / Smart Home" },
  ],
  "fencer": [
    { slug: "timber-fencing", name: "Timber Fencing" },
    { slug: "colorbond-fencing", name: "Colorbond Fencing" },
    { slug: "pool-fencing", name: "Pool Fencing" },
    { slug: "glass-pool-fencing", name: "Glass Pool Fencing" },
    { slug: "farm-rural-fencing", name: "Farm & Rural Fencing" },
    { slug: "retaining-wall-fencing", name: "Retaining Wall Fencing" },
    { slug: "automated-gates", name: "Automated Gates" },
    { slug: "boundary-dividing-fences", name: "Boundary & Dividing Fences" },
    { slug: "chain-link-security-fencing", name: "Chain Link & Security Fencing" },
  ],
  "flooring": [
    { slug: "timber-flooring", name: "Timber Flooring" },
    { slug: "engineered-timber-flooring", name: "Engineered Timber Flooring" },
    { slug: "laminate-flooring", name: "Laminate Flooring" },
    { slug: "vinyl-hybrid-flooring", name: "Vinyl & Hybrid Flooring" },
    { slug: "carpet-installation", name: "Carpet Installation" },
    { slug: "polished-concrete", name: "Polished Concrete" },
    { slug: "epoxy-flooring", name: "Epoxy Flooring" },
    { slug: "floor-sanding-polishing", name: "Floor Sanding & Polishing" },
    { slug: "bamboo-flooring", name: "Bamboo Flooring" },
    { slug: "commercial-flooring", name: "Commercial Flooring" },
  ],
  "gas-fitter": [
    { slug: "residential-gas-fitting", name: "Residential Gas Fitting" },
    { slug: "commercial-gas-fitting", name: "Commercial Gas Fitting" },
    { slug: "lpg-systems", name: "LPG Systems" },
    { slug: "natural-gas-connections", name: "Natural Gas Connections" },
    { slug: "gas-appliance-installation", name: "Gas Appliance Installation" },
    { slug: "gas-leak-detection-repair", name: "Gas Leak Detection & Repair" },
    { slug: "bbq-outdoor-gas-points", name: "BBQ & Outdoor Gas Points" },
    { slug: "industrial-gas-fitting", name: "Industrial Gas Fitting" },
  ],
  "glazier": [
    { slug: "window-installation-repair", name: "Window Installation & Repair" },
    { slug: "glass-splashbacks", name: "Glass Splashbacks" },
    { slug: "shower-screens", name: "Shower Screens" },
    { slug: "glass-balustrades", name: "Glass Balustrades" },
    { slug: "double-glazing", name: "Double Glazing" },
    { slug: "frameless-glass", name: "Frameless Glass" },
    { slug: "commercial-glazing", name: "Commercial Glazing" },
    { slug: "skylights", name: "Skylights" },
    { slug: "glass-replacement", name: "Glass Replacement" },
    { slug: "mirrors", name: "Mirrors" },
  ],
  "guttering": [
    { slug: "gutter-installation", name: "Gutter Installation" },
    { slug: "gutter-replacement", name: "Gutter Replacement" },
    { slug: "gutter-guard-installation", name: "Gutter Guard Installation" },
    { slug: "gutter-cleaning", name: "Gutter Cleaning" },
    { slug: "downpipe-installation", name: "Downpipe Installation" },
    { slug: "rainwater-tank-connection", name: "Rainwater Tank Connection" },
    { slug: "fascia-barge-board-replacement", name: "Fascia & Barge Board Replacement" },
    { slug: "commercial-guttering", name: "Commercial Guttering" },
  ],
  "handyman": [
    { slug: "general-repairs-maintenance", name: "General Repairs & Maintenance" },
    { slug: "flat-pack-assembly", name: "Flat Pack Assembly" },
    { slug: "tv-picture-mounting", name: "TV & Picture Mounting" },
    { slug: "door-window-repairs", name: "Door & Window Repairs" },
    { slug: "minor-carpentry", name: "Minor Carpentry" },
    { slug: "gutter-cleaning", name: "Gutter Cleaning" },
    { slug: "pressure-washing", name: "Pressure Washing" },
    { slug: "small-painting-jobs", name: "Small Painting Jobs" },
  ],
  "hot-water-systems": [
    { slug: "electric-hot-water", name: "Electric Hot Water" },
    { slug: "gas-hot-water", name: "Gas Hot Water" },
    { slug: "solar-hot-water", name: "Solar Hot Water" },
    { slug: "heat-pump-hot-water", name: "Heat Pump Hot Water" },
    { slug: "continuous-flow-instantaneous", name: "Continuous Flow / Instantaneous" },
    { slug: "commercial-hot-water", name: "Commercial Hot Water" },
    { slug: "hot-water-repairs", name: "Hot Water Repairs" },
    { slug: "hot-water-upgrades", name: "Hot Water Upgrades" },
  ],
  "insulation": [
    { slug: "ceiling-insulation", name: "Ceiling Insulation" },
    { slug: "wall-insulation", name: "Wall Insulation" },
    { slug: "underfloor-insulation", name: "Underfloor Insulation" },
    { slug: "bulk-insulation", name: "Bulk (Batts) Insulation" },
    { slug: "spray-foam-insulation", name: "Spray Foam Insulation" },
    { slug: "reflective-foil-insulation", name: "Reflective Foil Insulation" },
    { slug: "commercial-insulation", name: "Commercial Insulation" },
    { slug: "acoustic-insulation", name: "Acoustic Insulation" },
  ],
  "irrigation": [
    { slug: "residential-garden-irrigation", name: "Residential Garden Irrigation" },
    { slug: "commercial-sports-turf-irrigation", name: "Commercial & Sports Turf Irrigation" },
    { slug: "drip-irrigation", name: "Drip Irrigation" },
    { slug: "pop-up-sprinkler-systems", name: "Pop-Up Sprinkler Systems" },
    { slug: "rainwater-tank-systems", name: "Rainwater Tank Systems" },
    { slug: "irrigation-repairs-servicing", name: "Irrigation Repairs & Servicing" },
    { slug: "smart-irrigation-controllers", name: "Smart Irrigation Controllers" },
  ],
  "landscaper": [
    { slug: "garden-design-installation", name: "Garden Design & Installation" },
    { slug: "lawn-turf-installation", name: "Lawn & Turf Installation" },
    { slug: "native-gardens", name: "Native Gardens" },
    { slug: "hardscaping", name: "Hardscaping (Paths & Patios)" },
    { slug: "garden-maintenance", name: "Garden Maintenance" },
    { slug: "irrigation-installation", name: "Irrigation Installation" },
    { slug: "retaining-walls", name: "Retaining Walls" },
    { slug: "pool-surrounds-landscaping", name: "Pool Surrounds & Landscaping" },
    { slug: "residential-landscaping", name: "Residential Landscaping" },
    { slug: "commercial-landscaping", name: "Commercial Landscaping" },
    { slug: "revegetation-land-rehabilitation", name: "Revegetation & Land Rehabilitation" },
  ],
  "locksmith": [
    { slug: "residential-locksmith", name: "Residential Locksmith" },
    { slug: "commercial-locksmith", name: "Commercial Locksmith" },
    { slug: "emergency-lockout-service", name: "Emergency Lockout Service" },
    { slug: "lock-installation-rekeying", name: "Lock Installation & Rekeying" },
    { slug: "safe-installation-opening", name: "Safe Installation & Opening" },
    { slug: "access-control-systems", name: "Access Control Systems" },
    { slug: "master-key-systems", name: "Master Key Systems" },
    { slug: "automotive-locksmith", name: "Automotive Locksmith" },
  ],
  "painter": [
    { slug: "interior-painting", name: "Interior Painting" },
    { slug: "exterior-painting", name: "Exterior Painting" },
    { slug: "commercial-painting", name: "Commercial Painting" },
    { slug: "roof-painting", name: "Roof Painting" },
    { slug: "texture-feature-walls", name: "Texture & Feature Walls" },
    { slug: "pressure-cleaning-prep", name: "Pressure Cleaning & Prep" },
    { slug: "heritage-period-painting", name: "Heritage & Period Painting" },
    { slug: "industrial-coatings", name: "Industrial Coatings" },
    { slug: "graffiti-removal", name: "Graffiti Removal" },
    { slug: "spray-painting", name: "Spray Painting" },
  ],
  "paving": [
    { slug: "concrete-paving", name: "Concrete Paving" },
    { slug: "brick-block-paving", name: "Brick & Block Paving" },
    { slug: "travertine-natural-stone", name: "Travertine & Natural Stone" },
    { slug: "exposed-aggregate-paving", name: "Exposed Aggregate Paving" },
    { slug: "driveway-paving", name: "Driveway Paving" },
    { slug: "pool-paving", name: "Pool Paving" },
    { slug: "asphalt-paving", name: "Asphalt Paving" },
    { slug: "paving-repairs-resealing", name: "Paving Repairs & Resealing" },
  ],
  "pest-control": [
    { slug: "termite-inspection-treatment", name: "Termite Inspection & Treatment" },
    { slug: "general-pest-control", name: "General Pest Control" },
    { slug: "rodent-control", name: "Rodent Control" },
    { slug: "cockroach-treatment", name: "Cockroach Treatment" },
    { slug: "spider-ant-treatment", name: "Spider & Ant Treatment" },
    { slug: "pre-purchase-pest-inspection", name: "Pre-Purchase Pest Inspection" },
    { slug: "commercial-pest-control", name: "Commercial Pest Control" },
    { slug: "bee-wasp-removal", name: "Bee & Wasp Removal" },
  ],
  "plasterer": [
    { slug: "set-plaster", name: "Set Plaster (Solid Plaster)" },
    { slug: "plasterboard-drywall", name: "Plasterboard / Drywall" },
    { slug: "cornice-ornamental-plaster", name: "Cornice & Ornamental Plaster" },
    { slug: "external-render", name: "External Render" },
    { slug: "acrylic-render", name: "Acrylic Render" },
    { slug: "texture-coating", name: "Texture Coating" },
    { slug: "plaster-repairs", name: "Plaster Repairs" },
    { slug: "fireproofing-fire-rated-plaster", name: "Fireproofing / Fire-Rated Plaster" },
  ],
  "plumber": [
    { slug: "residential-plumber", name: "Residential Plumber" },
    { slug: "commercial-plumber", name: "Commercial Plumber" },
    { slug: "roof-plumber", name: "Roof Plumber" },
    { slug: "water-supply-plumber", name: "Water Supply Plumber" },
    { slug: "drainage-plumber", name: "Drainage Plumber" },
    { slug: "mechanical-services-plumber", name: "Mechanical / Services Plumber" },
    { slug: "fire-protection-plumber", name: "Fire Protection Plumber" },
    { slug: "irrigation-plumber", name: "Irrigation Plumber" },
    { slug: "pipe-relining", name: "Pipe Relining" },
    { slug: "emergency-plumber", name: "Emergency Plumber" },
    { slug: "backflow-prevention", name: "Backflow Prevention" },
    { slug: "septic-wastewater-systems", name: "Septic & Wastewater Systems" },
  ],
  "pool-builder": [
    { slug: "concrete-gunite-pools", name: "Concrete / Gunite Pools" },
    { slug: "fibreglass-pools", name: "Fibreglass Pools" },
    { slug: "above-ground-pools", name: "Above Ground Pools" },
    { slug: "lap-pools", name: "Lap Pools" },
    { slug: "plunge-pools-spas", name: "Plunge Pools & Spas" },
    { slug: "pool-renovations-resurfacing", name: "Pool Renovations & Resurfacing" },
    { slug: "pool-equipment-heating", name: "Pool Equipment & Heating" },
    { slug: "natural-swimming-ponds", name: "Natural / Swimming Ponds" },
  ],
  "renderer": [
    { slug: "cement-render", name: "Cement Render" },
    { slug: "acrylic-render", name: "Acrylic Render" },
    { slug: "texture-coating", name: "Texture Coating" },
    { slug: "hebel-aac-rendering", name: "Hebel & AAC Rendering" },
    { slug: "heritage-lime-render", name: "Heritage Lime Render" },
    { slug: "sand-cement-render", name: "Sand & Cement Render" },
    { slug: "render-repairs", name: "Render Repairs" },
    { slug: "feature-stone-brick-effect", name: "Feature Stone & Brick Effect" },
  ],
  "retaining-walls": [
    { slug: "timber-retaining-walls", name: "Timber Retaining Walls" },
    { slug: "concrete-block-retaining-walls", name: "Concrete Block Retaining Walls" },
    { slug: "sleeper-retaining-walls", name: "Sleeper Retaining Walls" },
    { slug: "stone-gabion-walls", name: "Stone & Gabion Walls" },
    { slug: "engineered-retaining-walls", name: "Engineered Retaining Walls" },
    { slug: "drainage-behind-retaining-walls", name: "Drainage Behind Retaining Walls" },
    { slug: "retaining-wall-repairs", name: "Retaining Wall Repairs" },
  ],
  "roofer": [
    { slug: "colorbond-metal-roofing", name: "Colorbond Metal Roofing" },
    { slug: "zincalume-roofing", name: "Zincalume Roofing" },
    { slug: "terracotta-tile-roofing", name: "Terracotta Tile Roofing" },
    { slug: "concrete-tile-roofing", name: "Concrete Tile Roofing" },
    { slug: "flat-low-pitch-roofing", name: "Flat / Low Pitch Roofing" },
    { slug: "roof-restoration-repointing", name: "Roof Restoration & Repointing" },
    { slug: "roof-repairs", name: "Roof Repairs" },
    { slug: "green-roofing", name: "Green Roofing" },
    { slug: "heritage-roofing", name: "Heritage Roofing" },
    { slug: "commercial-industrial-roofing", name: "Commercial & Industrial Roofing" },
    { slug: "skylights-roof-windows", name: "Skylights & Roof Windows" },
  ],
  "rubbish-removal": [
    { slug: "general-rubbish-removal", name: "General Rubbish Removal" },
    { slug: "skip-bin-hire", name: "Skip Bin Hire" },
    { slug: "construction-waste-removal", name: "Construction Waste Removal" },
    { slug: "green-waste-removal", name: "Green Waste Removal" },
    { slug: "furniture-whitegoods-removal", name: "Furniture & Whitegoods Removal" },
    { slug: "deceased-estate-cleanouts", name: "Deceased Estate Cleanouts" },
    { slug: "hoarder-cleanouts", name: "Hoarder Cleanouts" },
  ],
  "scaffolder": [
    { slug: "residential-scaffolding", name: "Residential Scaffolding" },
    { slug: "commercial-scaffolding", name: "Commercial Scaffolding" },
    { slug: "industrial-scaffolding", name: "Industrial Scaffolding" },
    { slug: "suspended-hanging-scaffolding", name: "Suspended / Hanging Scaffolding" },
    { slug: "modular-scaffolding", name: "Modular Scaffolding" },
    { slug: "scaffolding-hire-labour", name: "Scaffolding Hire & Labour" },
  ],
  "security-systems": [
    { slug: "alarm-systems", name: "Alarm Systems" },
    { slug: "cctv-surveillance", name: "CCTV & Surveillance" },
    { slug: "access-control-systems", name: "Access Control Systems" },
    { slug: "intercom-systems", name: "Intercom Systems" },
    { slug: "smart-locks-door-entry", name: "Smart Locks & Door Entry" },
    { slug: "fire-detection-alarms", name: "Fire Detection & Alarms" },
    { slug: "monitoring-services", name: "Monitoring Services" },
  ],
  "solar-installer": [
    { slug: "residential-solar-pv", name: "Residential Solar PV" },
    { slug: "commercial-solar-pv", name: "Commercial Solar PV" },
    { slug: "battery-storage-systems", name: "Battery Storage Systems" },
    { slug: "ev-charger-installation", name: "EV Charger Installation" },
    { slug: "solar-hot-water", name: "Solar Hot Water" },
    { slug: "off-grid-solar-systems", name: "Off-Grid Solar Systems" },
    { slug: "solar-panel-repairs-cleaning", name: "Solar Panel Repairs & Cleaning" },
    { slug: "feed-in-tariff-metering", name: "Feed-in Tariff & Metering" },
  ],
  "stonemasonry": [
    { slug: "feature-stone-walls", name: "Feature Stone Walls" },
    { slug: "bluestone-paving-capping", name: "Bluestone Paving & Capping" },
    { slug: "granite-marble-work", name: "Granite & Marble Work" },
    { slug: "sandstone-restoration", name: "Sandstone Restoration" },
    { slug: "heritage-stonework", name: "Heritage Stonework" },
    { slug: "stone-fireplaces", name: "Stone Fireplaces" },
    { slug: "stone-benchtops", name: "Stone Benchtops" },
    { slug: "retaining-walls", name: "Retaining Walls (Stone)" },
  ],
  "structural-engineer": [
    { slug: "residential-structural-engineering", name: "Residential Structural Engineering" },
    { slug: "commercial-structural-engineering", name: "Commercial Structural Engineering" },
    { slug: "footing-slab-design", name: "Footing & Slab Design" },
    { slug: "retaining-wall-engineering", name: "Retaining Wall Engineering" },
    { slug: "renovation-extension-certification", name: "Renovation & Extension Certification" },
    { slug: "pool-structural-design", name: "Pool Structural Design" },
    { slug: "geotechnical-assessment", name: "Geotechnical Assessment" },
  ],
  "surveyor": [
    { slug: "land-surveyor", name: "Land Surveyor" },
    { slug: "building-surveyor", name: "Building Surveyor" },
    { slug: "cadastral-surveyor", name: "Cadastral Surveyor" },
    { slug: "engineering-surveyor", name: "Engineering Surveyor" },
    { slug: "construction-surveyor", name: "Construction Surveyor" },
    { slug: "aerial-drone-surveyor", name: "Aerial / Drone Surveyor" },
    { slug: "mining-surveyor", name: "Mining Surveyor" },
    { slug: "quantity-surveyor", name: "Quantity Surveyor" },
  ],
  "tiler": [
    { slug: "floor-tiling", name: "Floor Tiling" },
    { slug: "wall-tiling", name: "Wall Tiling" },
    { slug: "bathroom-tiling", name: "Bathroom Tiling" },
    { slug: "kitchen-splashback-tiling", name: "Kitchen Splashback Tiling" },
    { slug: "pool-tiling", name: "Pool Tiling" },
    { slug: "outdoor-alfresco-tiling", name: "Outdoor / Alfresco Tiling" },
    { slug: "large-format-tiles", name: "Large Format Tiles" },
    { slug: "mosaic-tiling", name: "Mosaic Tiling" },
    { slug: "tile-repairs-regrouting", name: "Tile Repairs & Regrouting" },
    { slug: "commercial-tiling", name: "Commercial Tiling" },
  ],
  "tree-services": [
    { slug: "tree-removal", name: "Tree Removal" },
    { slug: "tree-pruning-trimming", name: "Tree Pruning & Trimming" },
    { slug: "stump-grinding-removal", name: "Stump Grinding & Removal" },
    { slug: "land-clearing", name: "Land Clearing" },
    { slug: "arborist-consulting-reports", name: "Arborist Consulting & Reports" },
    { slug: "hedge-trimming", name: "Hedge Trimming" },
    { slug: "emergency-tree-work", name: "Emergency Tree Work" },
    { slug: "tree-planting", name: "Tree Planting" },
  ],
  "wallpapering": [
    { slug: "residential-wallpapering", name: "Residential Wallpapering" },
    { slug: "commercial-wallpapering", name: "Commercial Wallpapering" },
    { slug: "feature-wall-wallpaper", name: "Feature Wall Wallpaper" },
    { slug: "mural-custom-prints", name: "Mural & Custom Prints" },
    { slug: "wallpaper-removal", name: "Wallpaper Removal" },
    { slug: "fabric-wall-coverings", name: "Fabric Wall Coverings" },
  ],
  "waterproofer": [
    { slug: "bathroom-wet-area-waterproofing", name: "Bathroom & Wet Area Waterproofing" },
    { slug: "balcony-deck-waterproofing", name: "Balcony & Deck Waterproofing" },
    { slug: "below-ground-waterproofing", name: "Below-Ground Waterproofing" },
    { slug: "roof-waterproofing", name: "Roof Waterproofing" },
    { slug: "retaining-wall-waterproofing", name: "Retaining Wall Waterproofing" },
    { slug: "pool-waterproofing", name: "Pool Waterproofing" },
    { slug: "commercial-waterproofing", name: "Commercial Waterproofing" },
    { slug: "damp-proofing", name: "Damp Proofing" },
  ],
  "welding": [
    { slug: "structural-steel-welding", name: "Structural Steel Welding" },
    { slug: "boilermaking", name: "Boilermaking" },
    { slug: "aluminium-welding", name: "Aluminium Welding" },
    { slug: "stainless-steel-welding", name: "Stainless Steel Welding" },
    { slug: "mobile-welding", name: "Mobile Welding" },
    { slug: "steel-fabrication", name: "Steel Fabrication" },
    { slug: "wrought-iron-work", name: "Wrought Iron Work" },
    { slug: "pipeline-welding", name: "Pipeline Welding" },
  ],
};

/** Shape persisted into builder_profiles.specialisations JSONB. */
export type BuilderSpecialisations = Record<string, string[]>;

/** Specialisations available for a trade. Empty if the trade has none (e.g. civil-construction). */
export function getSpecialisationsForTrade(
  tradeSlug: string,
): readonly TradeSpecialisation[] {
  return TRADE_SPECIALISATIONS[tradeSlug] ?? [];
}

/** True if the trade has any sub-trades. Use to gate rendering the picker. */
export function hasSpecialisations(tradeSlug: string): boolean {
  return getSpecialisationsForTrade(tradeSlug).length > 0;
}

/**
 * Resolve a stored specialisation slug back to its display name, scoped to a
 * given trade so duplicate slugs across trades (e.g. "pipe-relining" exists on
 * both plumber and drainage) resolve correctly.
 */
export function getSpecialisationName(
  tradeSlug: string,
  specSlug: string,
): string | null {
  return getSpecialisationsForTrade(tradeSlug).find((s) => s.slug === specSlug)?.name ?? null;
}

/**
 * Drop any specialisation slugs that don't belong to one of the builder's
 * selected trades, and dedupe within each trade. Defensive sanitiser for any
 * persistence path that takes user input.
 */
export function sanitiseSpecialisations(
  input: unknown,
  selectedTrades: readonly string[],
): BuilderSpecialisations {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: BuilderSpecialisations = {};
  const tradeSet = new Set(selectedTrades);
  for (const [trade, slugs] of Object.entries(input as Record<string, unknown>)) {
    if (!tradeSet.has(trade)) continue;
    if (!Array.isArray(slugs)) continue;
    const allowed = new Set(getSpecialisationsForTrade(trade).map((s) => s.slug));
    const kept = Array.from(
      new Set(slugs.filter((s): s is string => typeof s === "string" && allowed.has(s))),
    );
    if (kept.length > 0) out[trade] = kept;
  }
  return out;
}

/**
 * Sanitise a FLAT list of specialisation slugs against a single trade's
 * catalogue, dropping unknowns and deduping. Used for jobs, which carry one
 * trade and therefore a flat slug array (vs the per-trade map on builders).
 */
export function sanitiseSpecialitySlugs(
  input: unknown,
  tradeSlug: string,
): string[] {
  if (!Array.isArray(input)) return [];
  const allowed = new Set(getSpecialisationsForTrade(tradeSlug).map((s) => s.slug));
  return Array.from(
    new Set(input.filter((s): s is string => typeof s === "string" && allowed.has(s))),
  );
}

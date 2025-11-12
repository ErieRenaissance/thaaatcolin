/*
 * Data for the cascading manufacturing impact visualization.
 *
 * This file defines four global objects on the `window`:
 *
 *   - window.nodes: an array of node definitions used to draw circles and labels.
 *   - window.links: an array of two‑element arrays representing source/target
 *     relationships between nodes. These are used to draw connecting lines.
 *   - window.descriptions: a map from node ID to a longer textual description.
 *   - window.colors: a palette mapping category names to hex colours used to
 *     differentiate nodes.
 *
 * Node positions are now automatically calculated using force-directed layout.
 */

/* Colour palette used for the various degrees of the graph. */
window.colors = {
  root: "#c0392b",
  primary: "#e74c3c",
  secondary: "#f39c12",
  tertiary: "#3498db",
  advanced: "#9b59b6",
  very_advanced: "#8e44ad",
  emergent: "#b0b4b8ff"
};

/* Node definitions with clearer, more descriptive labels.
 * Positions are now calculated automatically via force simulation.
 */
window.nodes = [
  { id: "root", label: "Manufacturing Investment", cat: "root", deg: 0 },
  { id: "tax_revenue", label: "Tax Revenue", cat: "primary", deg: 1 },
  { id: "jobs", label: "Direct Employment", cat: "primary", deg: 1 },
  { id: "supply", label: "Supply Chain", cat: "primary", deg: 1 },
  { id: "infrastructure", label: "Infrastructure Investment", cat: "primary", deg: 2 },
  { id: "education", label: "Education Funding", cat: "primary", deg: 2 },
  { id: "amenities", label: "Public Amenities", cat: "primary", deg: 2 },
  { id: "income", label: "Household Income", cat: "primary", deg: 2 },
  { id: "suppliers", label: "Local Suppliers", cat: "primary", deg: 2 },
  { id: "tech", label: "Tech Sector Growth", cat: "secondary", deg: 4 },
  { id: "talent", label: "Talent Attraction", cat: "secondary", deg: 3 },
  { id: "workforce", label: "Skilled Workforce", cat: "secondary", deg: 3 },
  { id: "housing", label: "Housing Market", cat: "secondary", deg: 3 },
  { id: "qol", label: "Quality of Life", cat: "secondary", deg: 3 },
  { id: "health", label: "Health Access", cat: "secondary", deg: 3 },
  { id: "logistics", label: "Logistics Hub", cat: "secondary", deg: 3 },
  { id: "remote", label: "Remote Workers", cat: "tertiary", deg: 5 },
  { id: "culture", label: "Cultural Vitality", cat: "secondary", deg: 4 },
  { id: "brain_drain", label: "Talent Retention", cat: "secondary", deg: 4 },
  { id: "equity", label: "Home Equity", cat: "secondary", deg: 4 },
  { id: "population", label: "Population Growth", cat: "secondary", deg: 4 },
  { id: "healthcare", label: "Healthcare Facilities", cat: "secondary", deg: 4 },
  { id: "distribution", label: "Distribution Centers", cat: "advanced", deg: 7 },
  { id: "social", label: "Social Capital", cat: "tertiary", deg: 6 },
  { id: "services", label: "Professional Services", cat: "tertiary", deg: 5 },
  { id: "family", label: "Family Networks", cat: "tertiary", deg: 5 },
  { id: "entrepreneur", label: "Entrepreneurship", cat: "tertiary", deg: 5 },
  { id: "medical", label: "Medical Research", cat: "advanced", deg: 7 },
  { id: "civic", label: "Civic Leadership", cat: "advanced", deg: 7 },
  { id: "diversity", label: "Economic Diversity", cat: "tertiary", deg: 6 },
  { id: "childcare", label: "Childcare Access", cat: "tertiary", deg: 6 },
  { id: "vc", label: "Venture Capital", cat: "tertiary", deg: 6 },
  { id: "innovation", label: "Innovation Ecosystem", cat: "tertiary", deg: 6 },
  { id: "brand", label: "Regional Brand", cat: "tertiary", deg: 6 },
  { id: "biotech", label: "Biotech Sector", cat: "very_advanced", deg: 8 },
  { id: "network", label: "Network Effects", cat: "very_advanced", deg: 8 },
  { id: "democracy", label: "Democratic Engagement", cat: "very_advanced", deg: 8 },
  { id: "resilience", label: "Economic Resilience", cat: "advanced", deg: 7 },
  { id: "female", label: "Female Labor Force", cat: "advanced", deg: 7 },
  { id: "investors", label: "Angel Investors", cat: "advanced", deg: 7 },
  { id: "knowledge", label: "Knowledge Hub", cat: "advanced", deg: 7 },
  { id: "expansion", label: "Business Expansion", cat: "tertiary", deg: 5 },
  { id: "planning", label: "Urban Planning", cat: "very_advanced", deg: 8 },
  { id: "blight", label: "Blight Prevention", cat: "very_advanced", deg: 8 },
  { id: "edu_cycle", label: "Education Cycle", cat: "very_advanced", deg: 8 },
  { id: "social_svc", label: "Social Services", cat: "very_advanced", deg: 8 },
  { id: "institutional", label: "Institutional Capacity", cat: "very_advanced", deg: 8 },
  { id: "capital", label: "Local Capital Pools", cat: "advanced", deg: 7 },
  { id: "sovereignty", label: "Economic Sovereignty", cat: "very_advanced", deg: 8 },
  { id: "res_mult", label: "Resilience Multiplier", cat: "emergent", deg: 9 },
  { id: "tal_mag", label: "Talent Magnet Effect", cat: "emergent", deg: 9 },
  { id: "innov_pipe", label: "Innovation Pipeline", cat: "emergent", deg: 9 },
  { id: "intergen", label: "Intergenerational Wealth", cat: "emergent", deg: 9 },
  { id: "dem_vital", label: "Democratic Vitality", cat: "emergent", deg: 9 }
];

/* Links between nodes - these drive the automatic layout */
window.links = [
  // Primary connections from manufacturing
  ["root", "tax_revenue"],
  ["root", "jobs"],
  ["root", "supply"],
  
  // Tax revenue impacts
  ["tax_revenue", "infrastructure"],
  ["tax_revenue", "education"],
  ["tax_revenue", "amenities"],
  
  // Employment impacts
  ["jobs", "income"],
  ["jobs", "workforce"],
  
  // Supply chain impacts
  ["supply", "suppliers"],
  ["supply", "logistics"],
  
  // Infrastructure effects
  ["infrastructure", "talent"],
  ["infrastructure", "housing"],
  ["infrastructure", "qol"],
  
  // Education effects
  ["education", "workforce"],
  ["education", "talent"],
  
  // Amenities effects
  ["amenities", "qol"],
  ["amenities", "housing"],
  
  // Income effects
  ["income", "housing"],
  ["income", "health"],
  ["income", "qol"],
  
  // Suppliers effects
  ["suppliers", "logistics"],
  
  // Workforce development
  ["workforce", "brain_drain"],
  ["workforce", "culture"],
  ["workforce", "tech"],
  
  // Talent attraction
  ["talent", "tech"],
  ["talent", "culture"],
  ["talent", "remote"],
  
  // Housing market effects
  ["housing", "equity"],
  ["housing", "population"],
  
  // Quality of life effects
  ["qol", "population"],
  ["qol", "culture"],
  
  // Health effects
  ["health", "healthcare"],
  ["health", "population"],
  
  // Logistics development
  ["logistics", "distribution"],
  ["logistics", "network"],
  
  // Tech sector growth
  ["tech", "remote"],
  ["tech", "services"],
  ["tech", "innovation"],
  
  // Culture development
  ["culture", "services"],
  ["culture", "social"],
  ["culture", "diversity"],
  
  // Retention effects
  ["brain_drain", "family"],
  ["brain_drain", "talent"],
  
  // Home equity effects
  ["equity", "entrepreneur"],
  ["equity", "expansion"],
  
  // Population growth
  ["population", "services"],
  ["population", "healthcare"],
  ["population", "diversity"],
  
  // Healthcare development
  ["healthcare", "medical"],
  
  // Distribution effects
  ["distribution", "network"],
  
  // Remote workers effects
  ["remote", "social"],
  
  // Social capital
  ["social", "civic"],
  ["social", "diversity"],
  
  // Services sector
  ["services", "culture"],
  ["services", "diversity"],
  
  // Family networks
  ["family", "childcare"],
  ["family", "social"],
  
  // Entrepreneurship
  ["entrepreneur", "vc"],
  ["entrepreneur", "innovation"],
  ["entrepreneur", "expansion"],
  
  // Medical research
  ["medical", "biotech"],
  ["medical", "innovation"],
  
  // Civic expertise
  ["civic", "planning"],
  ["civic", "democracy"],
  
  // Diversity effects
  ["diversity", "female"],
  ["diversity", "resilience"],
  
  // Childcare effects
  ["childcare", "female"],
  ["childcare", "edu_cycle"],
  
  // Venture capital
  ["vc", "investors"],
  ["vc", "innovation"],
  
  // Innovation ecosystem
  ["innovation", "knowledge"],
  ["innovation", "biotech"],
  
  // Regional brand
  ["brand", "culture"],
  ["brand", "talent"],
  
  // Biotech development
  ["biotech", "knowledge"],
  
  // Network effects
  ["network", "expansion"],
  
  // Democracy
  ["democracy", "planning"],
  
  // Resilience
  ["resilience", "blight"],
  
  // Female workforce
  ["female", "income"],
  ["female", "edu_cycle"],
  
  // Local investors
  ["investors", "capital"],
  ["investors", "social_svc"],
  
  // Knowledge hub
  ["knowledge", "institutional"],
  
  // Expansion
  ["expansion", "jobs"],
  
  // Planning
  ["planning", "infrastructure"],
  
  // Blight prevention
  ["blight", "housing"],
  
  // Education cycle
  ["edu_cycle", "education"],
  ["edu_cycle", "institutional"],
  
  // Social services
  ["social_svc", "health"],
  ["social_svc", "institutional"],
  
  // Institutional knowledge
  ["institutional", "democracy"],
  
  // Local capital
  ["capital", "sovereignty"],
  ["capital", "vc"],
  
  // Sovereignty
  ["sovereignty", "resilience"],
  
  // Emergent properties - resilience multiplier
  ["resilience", "res_mult"],
  ["blight", "res_mult"],
  ["network", "res_mult"],
  
  // Emergent properties - talent magnet
  ["talent", "tal_mag"],
  ["culture", "tal_mag"],
  ["brain_drain", "tal_mag"],
  ["remote", "tal_mag"],
  
  // Emergent properties - innovation pipeline
  ["innovation", "innov_pipe"],
  ["knowledge", "innov_pipe"],
  ["tech", "innov_pipe"],
  ["biotech", "innov_pipe"],
  
  // Emergent properties - intergenerational
  ["edu_cycle", "intergen"],
  ["family", "intergen"],
  ["equity", "intergen"],
  ["capital", "intergen"],
  
  // Emergent properties - democratic vitality
  ["democracy", "dem_vital"],
  ["civic", "dem_vital"],
  ["planning", "dem_vital"],
  ["institutional", "dem_vital"]
];

/* Improved descriptions with clearer context */
window.descriptions = {
  // Root node
  root: "Local manufacturing creates stable, long-term employment and drives sustained economic activity through direct jobs, supply chain development, and tax revenue generation that funds public infrastructure and services.",
  
  // Primary (1st degree)
  tax_revenue: "Manufacturing facilities generate predictable property and business tax revenues that fund essential public infrastructure, education systems, and community amenities, creating a stable foundation for long-term regional development.",
  jobs: "Direct manufacturing employment provides stable middle-class wages with benefits, creating household income that supports local retail, services, and housing markets while building skilled workforce capacity.",
  supply: "Manufacturing operations require extensive local supply chains including raw materials, components, maintenance services, and logistics support, creating dense networks of interdependent businesses.",
  
  // Secondary (2nd degree)
  infrastructure: "Tax revenues enable investments in roads, utilities, broadband, and public facilities that improve business efficiency, attract new residents, and enhance quality of life across all economic sectors.",
  education: "Stable tax revenues fund quality K-12 education and workforce training programs that develop local talent pipelines, reduce brain drain, and create intergenerational educational advancement cycles.",
  amenities: "Public investment in parks, libraries, cultural facilities, and recreation programs enhances community identity, attracts families and talent, and creates distinctive regional character that drives population growth.",
  income: "Steady manufacturing wages enable families to achieve financial security, invest in homes and education, support local businesses, and participate in civic life, creating multiplier effects throughout the economy.",
  suppliers: "Local supplier networks develop specialized capabilities and institutional knowledge that reduce costs and lead times for manufacturers while creating diversified employment beyond the primary facilities.",
  
  // Tertiary (3rd degree)
  talent: "Quality infrastructure and education systems attract and retain skilled professionals, creating talent density that enables business sophistication, innovation capacity, and competitive advantages in knowledge-intensive sectors.",
  workforce: "Educated local workforce with relevant technical skills reduces training costs, builds institutional knowledge, and enables manufacturers to adopt advanced processes while preventing costly brain drain to other regions.",
  housing: "Strong employment and income growth drives housing demand, increasing property values and home equity that enables household wealth building, small business formation, and intergenerational wealth transfer.",
  qol: "Combined effects of infrastructure, amenities, and income create quality of life advantages that attract families, retain young professionals, and build regional reputation that compounds over time.",
  health: "Stable employment with health benefits improves population health outcomes, reduces healthcare costs, enables workforce productivity, and creates demand for medical services and research facilities.",
  logistics: "Dense supplier networks and strong infrastructure create logistics efficiency advantages that attract distribution centers, reduce business costs across sectors, and establish permanent competitive advantages through network effects.",
  
  // Advanced (4th degree)
  tech: "Talent density, educated workforce, and quality of life attract technology companies and remote workers who bring high incomes, innovation practices, and network connections that diversify the economy beyond manufacturing.",
  culture: "Growing population and quality of life support cultural institutions, arts venues, restaurants, and entertainment that enhance regional identity, attract tourists, and create distinctive community character.",
  brain_drain: "Quality employment opportunities, family networks, and cultural amenities convince educated young people to remain in or return to the region, preventing talent loss and enabling intergenerational knowledge transfer.",
  equity: "Rising home values create household wealth through equity appreciation, enabling families to fund education, start businesses, weather financial shocks, and build intergenerational wealth without extractive debt.",
  population: "Quality of life improvements and economic opportunity drive population growth that creates larger consumer markets, deeper talent pools, and increased political influence while justifying expanded services and infrastructure.",
  healthcare: "Health insurance coverage and population growth support expanded medical facilities, specialist providers, and advanced care options that improve health outcomes and attract medical professionals to the region.",
  distribution: "Logistics efficiency and strategic location attract regional distribution centers for national retailers and manufacturers, creating permanent competitive advantages and additional employment.",
  
  // Advanced (5th degree)  
  remote: "Technology infrastructure and quality of life attract remote workers with high incomes who contribute economically without competing for local jobs, bringing outside wealth, networks, and innovation practices into the community.",
  services: "Population growth and increased incomes drive demand for professional services including legal, accounting, consulting, financial planning, and business services that create white-collar employment and economic diversification.",
  family: "Reduced brain drain keeps extended family networks intact across generations, providing informal childcare support, enabling female workforce participation, and creating social capital that reduces public service costs.",
  entrepreneur: "Home equity, local capital, and business networks enable residents to start companies with lower financial risk, creating innovation, diversified employment, and locally-owned businesses that keep wealth in the community.",
  expansion: "Business success and market growth drive facility expansions that create construction activity, additional employment, and increased supply chain demand, reinforcing all previous cascade effects.",
  
  // Very Advanced (6th degree)
  social: "Cultural vitality, diversity, and intact family networks create social capital through trust, civic participation, and mutual support that enables collective action, reduces crime, and improves governance effectiveness.",
  diversity: "Population growth and cultural amenities attract diverse residents who bring varied perspectives, skills, and networks that drive innovation, improve decision-making, and create resilient, adaptable communities.",
  childcare: "Family networks and small business formation create accessible childcare options that enable parents, especially mothers, to participate fully in the workforce and pursue education and career advancement.",
  vc: "Successful entrepreneurs and growing businesses attract venture capital and angel investors who provide funding, mentorship, and networks that accelerate innovation and enable high-growth company formation.",
  innovation: "Technology companies, research institutions, and entrepreneurial activity create innovation ecosystems where ideas, talent, and capital combine to generate intellectual property, patents, and breakthrough technologies.",
  brand: "Cumulative effects of economic vitality, cultural amenities, and quality of life create distinctive regional identity that attracts investment, talent, and tourism while building civic pride and political influence.",
  
  // Seventh degree
  civic: "Successful professionals and engaged residents contribute leadership, expertise, and funding to nonprofit boards, government commissions, and civic organizations, improving institutional effectiveness and community outcomes.",
  resilience: "Economic diversification, social capital, and institutional strength create community resilience that enables rapid recovery from economic shocks, natural disasters, and industry disruptions without permanent damage.",
  female: "Accessible childcare and flexible employment enable women to participate fully in the workforce, increasing household incomes, tax revenues, and talent pool depth while modeling economic opportunity for daughters.",
  investors: "Successful business owners become angel investors and philanthropists who fund new ventures, nonprofit initiatives, and community development, keeping capital circulating locally rather than extracting wealth.",
  knowledge: "Research institutions, technology companies, and skilled workforce create knowledge concentrations that attract additional research funding, industry partnerships, and innovation activity in self-reinforcing patterns.",
  medical: "Healthcare facilities and research funding support medical research institutions that generate patents, attract industry partnerships, and create biotech spinoff companies that diversify the economy.",
  capital: "Local investors, credit unions, and community banks keep capital circulating within the region rather than extracting wealth to distant financial centers, funding local business growth and home ownership.",
  
  // Eighth degree
  democracy: "Civic engagement, institutional knowledge, and educated population create effective democratic governance with informed voters, responsive officials, and evidence-based policies that improve community outcomes.",
  planning: "Civic expertise and democratic participation enable sophisticated long-term urban planning that anticipates infrastructure needs, preserves environmental assets, and makes strategic investments that compound over time.",
  blight: "Economic resilience and housing stability prevent foreclosure cascades during downturns, maintaining neighborhood cohesion and property values that avoid destructive blight cycles requiring expensive intervention.",
  edu_cycle: "Family stability, local ownership, and economic security enable parents to invest in children's education and enrichment, creating intergenerational achievement cycles that build human capital across generations.",
  social_svc: "Local philanthropic capital and engaged civic leadership fund effective nonprofit organizations addressing food insecurity, addiction services, youth programs, and other social needs that create community stability.",
  institutional: "Decades of community investment create institutional capacity in government agencies, nonprofits, and civic organizations that enables sophisticated problem-solving and effective service delivery.",
  biotech: "Medical research capabilities and innovation infrastructure support biotechnology companies that generate intellectual property, high-value employment, and industry partnerships in cutting-edge sectors.",
  network: "Logistics advantages and distribution concentration create network effects where each additional facility makes the region more attractive for others, establishing permanent structural advantages.",
  sovereignty: "Local capital ownership and reduced dependence on extractive external finance create economic sovereignty that enables community-driven development and resilience against external financial shocks.",
  
  // Emergent properties (9th degree+)
  res_mult: "Multiple reinforcing resilience mechanisms across economic diversification, social capital, institutional capacity, and infrastructure create adaptive capacity that enables communities to thrive through disruption and change.",
  tal_mag: "Combined effects of employment opportunity, cultural vitality, quality of life, and professional networks create powerful talent magnetism that attracts educated workers from across regions and reverses brain drain.",
  innov_pipe: "Dense networks of research institutions, technology companies, entrepreneurial support, and venture capital create innovation pipelines that continuously generate new companies, technologies, and economic opportunities.",
  intergen: "Home equity, family networks, educational achievement, and local capital ownership enable intergenerational wealth building and opportunity transfer that compounds across generations without extractive debt.",
  dem_vital: "Civic engagement, institutional sophistication, informed participation, and effective governance create vibrant democratic culture that enables collective action, responsive policy, and community-driven development."
};

import { Issue, CommunityMessage } from "./types";
import imgPothole from "./assets/images/regenerated_image_1782839153223.png";
import imgWaterLeak from "./assets/images/regenerated_image_1782839156842.png";
import imgStreetlight from "./assets/images/regenerated_image_1782839158861.png";
import imgMedicalWaste from "./assets/images/regenerated_image_1782839161412.png";
import imgManhole from "./assets/images/regenerated_image_1782839163440.png";
import imgFallenTree from "./assets/images/regenerated_image_1782838361047.png";
import imgSewage from "./assets/images/regenerated_image_1782837905767.png";
import imgTransformer from "./assets/images/regenerated_image_1782837902954.png";

export const LOCALITIES = [
  "Old Bowenpally",
  "New Bowenpally",
  "Kukatpally",
  "Madhapur",
  "Gachibowli",
  "Secunderabad",
  "Banjara Hills",
  "Jubilee Hills",
  "Ameerpet",
  "Dilsukhnagar"
];

export const INITIAL_ISSUES: Issue[] = [
  {
    id: "demo-1",
    title: "Dangerous double pothole on Mahatma Gandhi Road",
    desc: "Two extremely deep potholes right after the main intersection signal. Cars are swerving into the opposite lane to avoid them, creating a major hazard at night.",
    loc: "Mahatma Gandhi Road, Near Metro Pillar 142",
    locality: "Old Bowenpally",
    lat: 17.4725,
    lng: 78.4795,
    cat: "Road Damage",
    priority: "critical",
    status: "open",
    reporterName: "Rajesh Kumar",
    reporterUid: "demo-user-1",
    votes: 34,
    upvoters: [],
    verifiers: ["user-1", "user-2", "user-3", "user-4", "user-5", "user-6", "user-7", "user-8", "user-9", "user-10", "user-11", "user-12"],
    isVerified: true,
    imageUrl: imgPothole,
    time: 1782734079000, // 6/29/2026, 3:54:39 AM
    aiAnalysis: "🤖 Gemini Diagnostic Audit:\n- FAILURE CAUSE: Heavy rainfall coupled with lack of standard sub-base compaction.\n- MUNICIPAL DEPT: Municipal Corporation Public Works Department (PWD).\n- CITIZEN DIRECTIVE: Place safety cones around the potholes to alert oncoming drivers.",
    authority: "Municipal Corporation Public Works Department (PWD)",
    priorityJustification: "Severe road hazard that forces vehicles into oncoming traffic lanes. High risk of serious accidents at night.",
    immediateCitizenSafetyAction: "Place safety cones around the potholes to alert oncoming drivers.",
    logs: [
      { text: "Issue reported by Rajesh Kumar.", by: "Rajesh Kumar", time: "6/29/2026, 3:54:39 AM", timestamp: 1782734079000 },
      { text: "Issue upvoted by community member.", by: "dvarshini826@gmail.com", time: "6/30/2026, 6:53:22 PM", timestamp: 1782872002000 },
      { text: "Issue validated as genuine by Varshini.", by: "Varshini", time: "6/30/2026, 6:53:22 PM", timestamp: 1782872002100 },
      { text: "Status promoted to Validated due to citizen verification.", by: "System", time: "6/30/2026, 6:53:22 PM", timestamp: 1782872002200 },
      { text: "Citizen Varshini confirmed this issue as resolved.", by: "Varshini", time: "6/30/2026, 6:53:24 PM", timestamp: 1782872004000 },
      { text: "Issue resolution successfully validated. Case Closed.", by: "System", time: "6/30/2026, 6:53:24 PM", timestamp: 1782872004100 }
    ]
  },
  {
    id: "demo-2",
    title: "Major water pipeline burst flooding Street 12",
    desc: "Main underground water pipeline has ruptured, sending a massive geyser of clean water onto the street. Water has accumulated up to 1 foot deep, flooding driveways.",
    loc: "Street 12, Sector 4, Green Park",
    locality: "Old Bowenpally",
    lat: 17.4710,
    lng: 78.4810,
    cat: "Water Leakage",
    priority: "high",
    status: "in-progress",
    reporterName: "Aarav Mehta",
    reporterUid: "demo-user-2",
    votes: 28,
    upvoters: [],
    verifiers: ["user-1", "user-2", "user-3", "user-4", "user-5", "user-6", "user-7", "user-8"],
    isVerified: true,
    imageUrl: imgWaterLeak,
    time: 1782647000000, // 6/28/2026
    aiAnalysis: "🤖 Gemini Diagnostic Audit:\n- FAILURE CAUSE: Underground high-pressure conduit weld shear.\n- MUNICIPAL DEPT: Hyderabad Metropolitan Water Supply & Sewerage Board (HMWS&SB).\n- CITIZEN DIRECTIVE: Avoid driving through deep water pockets on Street 12. Turn off local main valves.",
    authority: "Hyderabad Metropolitan Water Supply & Sewerage Board (HMWS&SB)",
    priorityJustification: "High-pressure rupture causing massive water wastage and localized road flooding. Risk of basement flooding.",
    immediateCitizenSafetyAction: "Avoid driving through deep water pockets on Street 12. Turn off local main valves if accessible.",
    logs: [
      { text: "Issue reported by Aarav Mehta.", by: "Aarav Mehta", time: "6/28/2026, 9:15:00 AM", timestamp: 1782647000000 },
      { text: "Issue validated as genuine by community.", by: "System", time: "6/28/2026, 11:30:00 AM", timestamp: 1782655000000 },
      { text: "Dispatched to HMWS&SB Water Maintenance division.", by: "System", time: "6/28/2026, 2:00:00 PM", timestamp: 1782664000000 }
    ]
  },
  {
    id: "demo-3",
    title: "Defective streetlights near public park",
    desc: "A series of 4 consecutive streetlights are completely out, leaving the entire sidewalk and park entrance in total darkness. Women and senior citizens feel unsafe.",
    loc: "Subhash Chandra Bose Park Main Gate",
    locality: "Old Bowenpally",
    lat: 17.4754,
    lng: 78.4835,
    cat: "Streetlight",
    priority: "medium",
    status: "resolved",
    reporterName: "Zara Sheikh",
    reporterUid: "demo-user-3",
    votes: 28,
    upvoters: [],
    verifiers: ["user-1", "user-2", "user-3", "user-4", "user-5", "user-6"],
    isVerified: true,
    imageUrl: imgStreetlight,
    time: 1782615000000, // 6/28/2026
    aiAnalysis: "🤖 Gemini Diagnostic Audit:\n- FAILURE CAUSE: Phase controller fuse blown in the local distribution block.\n- MUNICIPAL DEPT: Southern Power Distribution Company (TSSPDCL).\n- CITIZEN DIRECTIVE: Carry flashlights. Avoid unlit park walks.",
    authority: "Southern Power Distribution Company (TSSPDCL)",
    priorityJustification: "Defective public lamps causing complete darkness at an active public gathering area. Elevates security risks.",
    immediateCitizenSafetyAction: "Use mobile phone flashlights. Avoid solitary walks after dark near the south gate.",
    logs: [
      { text: "Issue reported by Zara Sheikh.", by: "Zara Sheikh", time: "6/28/2026, 10:12:00 PM", timestamp: 1782615000000 },
      { text: "Inspected by electrical engineering team.", by: "System", time: "6/29/2026, 11:00:00 AM", timestamp: 1782661200000 },
      { text: "Lamps replaced and grid fuse reset.", by: "System", time: "6/29/2026, 4:30:00 PM", timestamp: 1782681000000 },
      { text: "Citizen Zara Sheikh confirmed issue resolved.", by: "Zara Sheikh", time: "6/29/2026, 8:00:00 PM", timestamp: 1782693600000 }
    ]
  },
  {
    id: "demo-4",
    title: "Hazardous medical and electronic waste dump on School Road",
    desc: "A large illegal dumping site has formed near the Primary School boundary. Syringes, broken computer screens, and lead batteries are lying in the open. Children play nearby. Extremely dangerous.",
    loc: "School Road, Near St. Mary Primary School Gate",
    locality: "Old Bowenpally",
    lat: 17.4705,
    lng: 78.4820,
    cat: "Waste Management",
    priority: "high",
    status: "open",
    reporterName: "Dr. Ananya Reddy",
    reporterUid: "demo-user-4",
    votes: 18,
    upvoters: [],
    verifiers: ["user-1", "user-2"],
    isVerified: false,
    imageUrl: imgMedicalWaste,
    time: 1782806400000, // 6/30/2026, 12:00 PM
    aiAnalysis: "🤖 Gemini Diagnostic Audit:\n- FAILURE CAUSE: Commercial trucks utilizing secondary lanes to bypass surveillance checkpoints.\n- MUNICIPAL DEPT: State Pollution Control Board & Municipal Sanitation Wing.\n- CITIZEN DIRECTIVE: Do not attempt to touch or manually clear medical gear. Keep children away from the site.",
    authority: "State Pollution Control Board & Municipal Sanitation Wing",
    priorityJustification: "Biohazard and chemical toxic materials located adjacent to a primary education facility. High risk of child contamination.",
    immediateCitizenSafetyAction: "Do not attempt to touch or manually clear medical gear. Alert school authorities and keep children away.",
    logs: [
      { text: "Issue reported by Dr. Ananya Reddy.", by: "Dr. Ananya Reddy", time: "6/30/2026, 12:00:00 PM", timestamp: 1782806400000 },
      { text: "Samaj Shakti AI classified category as Waste Management with High severity.", by: "System", time: "6/30/2026, 12:01:00 PM", timestamp: 1782806460000 }
    ]
  },
  {
    id: "demo-5",
    title: "Unprotected open drainage manhole near playground",
    desc: "The concrete cover of the main stormwater chamber has collapsed entirely. The open hole is 6 feet deep and invisible after sunset. Located right where the colony kids play cricket.",
    loc: "Colony Lane 5, Opposite Central Park Playground",
    locality: "Old Bowenpally",
    lat: 17.4735,
    lng: 78.4842,
    cat: "Infrastructure",
    priority: "critical",
    status: "in-progress",
    reporterName: "Siddharth Naik",
    reporterUid: "demo-user-5",
    votes: 42,
    upvoters: [],
    verifiers: ["user-1", "user-2", "user-3", "user-4", "user-5", "user-6", "user-7", "user-8", "user-9", "user-10"],
    isVerified: true,
    imageUrl: imgManhole,
    time: 1782723600000, // 6/29/2026
    aiAnalysis: "🤖 Gemini Diagnostic Audit:\n- FAILURE CAUSE: Heavy vehicle loading over a non-reinforced utility chamber lid.\n- MUNICIPAL DEPT: National Highways & Urban Drainage Department.\n- CITIZEN DIRECTIVE: Place wood boards or warning tree branches inside the hole until concrete ring is recast.",
    authority: "Urban Drainage Department & Municipal Corporation",
    priorityJustification: "Open drop hazard of 6ft depth at high-density child recreation zone. Extreme injury and drowning hazard.",
    immediateCitizenSafetyAction: "Place wood boards or warning tree branches around the hole. Avoid the park edge after dark.",
    logs: [
      { text: "Issue reported by Siddharth Naik.", by: "Siddharth Naik", time: "6/29/2026, 1:00:00 AM", timestamp: 1782723600000 },
      { text: "Validated as genuine by community upvotes and coord-1 audit.", by: "Srinivas", time: "6/29/2026, 9:00:00 AM", timestamp: 1782752400000 },
      { text: "Contractor assigned for concrete cover casting.", by: "System", time: "6/29/2026, 4:00:00 PM", timestamp: 1782777600000 }
    ]
  },
  {
    id: "demo-6",
    title: "Old Banyan tree fallen across arterial road",
    desc: "A massive Banyan tree has uprooted due to soft soil and fallen completely across the road, blocking all vehicular movement. Power lines have been pulled down as well.",
    loc: "Kukatpally Housing Board, Road No. 4",
    locality: "Kukatpally",
    lat: 17.4850,
    lng: 78.3950,
    cat: "Disaster Management",
    priority: "critical",
    status: "open",
    reporterName: "Venkatesh Rao",
    reporterUid: "demo-user-6",
    votes: 56,
    upvoters: [],
    verifiers: ["user-1", "user-2", "user-3", "user-4"],
    isVerified: true,
    imageUrl: imgFallenTree,
    time: 1782873600000, // 6/30/2026
    aiAnalysis: "🤖 Gemini Diagnostic Audit:\n- FAILURE CAUSE: Soil liquefaction after 48h of continuous rain.\n- MUNICIPAL DEPT: Forest Department & Disaster Response Force (DRF).\n- CITIZEN DIRECTIVE: Do not touch fallen wires. Use alternate route via KPHB Phase 3.",
    authority: "Forest Department & Disaster Response Force",
    priorityJustification: "Arterial road blockage causing massive traffic congestion. Live wires on the ground posing lethal risk.",
    immediateCitizenSafetyAction: "Maintain 10m distance from fallen power lines. Divert traffic manually until police arrive.",
    logs: [
      { text: "Issue reported by Venkatesh Rao.", by: "Venkatesh Rao", time: "6/30/2026, 6:00:00 AM", timestamp: 1782873600000 },
      { text: "Emergency Disaster Response alerted.", by: "System", time: "6/30/2026, 6:15:00 AM", timestamp: 1782874500000 }
    ]
  },
  {
    id: "demo-7",
    title: "Overflowing sewage at Madhapur Metro base",
    desc: "Raw sewage is overflowing from a manhole right at the base of the Metro station stairs. The stench is overwhelming and commuters are forced to step through contaminated water.",
    loc: "Madhapur Metro Station, Entry Gate A",
    locality: "Madhapur",
    lat: 17.4430,
    lng: 78.3810,
    cat: "Waste Management",
    priority: "high",
    status: "in-progress",
    reporterName: "Priya Sharma",
    reporterUid: "demo-user-7",
    votes: 22,
    upvoters: [],
    verifiers: ["user-1", "user-2", "user-3"],
    isVerified: true,
    imageUrl: imgSewage,
    time: 1782877200000, // 6/30/2026
    aiAnalysis: "🤖 Gemini Diagnostic Audit:\n- FAILURE CAUSE: Blockage due to non-biodegradable commercial waste from nearby food courts.\n- MUNICIPAL DEPT: Sewerage Board Maintenance Wing.\n- CITIZEN DIRECTIVE: Use Entry Gate B. Avoid direct skin contact with effluent.",
    authority: "Hyderabad Metropolitan Water Supply & Sewerage Board",
    priorityJustification: "Public health hazard at a high-footfall transport hub. Risk of cholera and other water-borne diseases.",
    immediateCitizenSafetyAction: "Use Metro Gate B for entry/exit. Notify station authorities to place temporary mats.",
    logs: [
      { text: "Issue reported by Priya Sharma.", by: "Priya Sharma", time: "6/30/2026, 7:00:00 AM", timestamp: 1782877200000 },
      { text: "Sewerage vacuum truck dispatched.", by: "System", time: "6/30/2026, 8:30:00 AM", timestamp: 1782882600000 }
    ]
  },
  {
    id: "demo-8",
    title: "Aggressive stray dog pack near IT Park school",
    desc: "A pack of 8-10 aggressive stray dogs has taken over the lane leading to the corporate daycare. They have chased several pedestrians and a delivery rider in the last 24 hours.",
    loc: "DLF Cyber City Road, Lane 2",
    locality: "Gachibowli",
    lat: 17.4475,
    lng: 78.3580,
    cat: "Public Safety",
    priority: "medium",
    status: "open",
    reporterName: "Karthik Reddy",
    reporterUid: "demo-user-8",
    votes: 15,
    upvoters: [],
    verifiers: ["user-1"],
    isVerified: false,
    imageUrl: imgSewage,
    time: 1782880800000, // 6/30/2026
    aiAnalysis: "🤖 Gemini Diagnostic Audit:\n- FAILURE CAUSE: Territorial aggression due to nearby open meat waste disposal.\n- MUNICIPAL DEPT: Veterinary & Animal Welfare Wing (GHMC).\n- CITIZEN DIRECTIVE: Do not run if approached. Walk slowly and carry a stick for defense.",
    authority: "GHMC Veterinary Department",
    priorityJustification: "Threat to children and commuters in a busy IT corridor. Risk of rabies and injury.",
    immediateCitizenSafetyAction: "Parents are advised to accompany children to daycare. Avoid carrying open food in this lane.",
    logs: [
      { text: "Issue reported by Karthik Reddy.", by: "Karthik Reddy", time: "6/30/2026, 8:00:00 AM", timestamp: 1782880800000 }
    ]
  },
  {
    id: "demo-9",
    title: "Exposed high-voltage transformer wires",
    desc: "The protective fencing of the local transformer has been cut. Live high-voltage cables are hanging low, almost at shoulder height for a tall person. Sparks are visible during light rain.",
    loc: "Secunderabad Station Road, Behind Bus Stand",
    locality: "Secunderabad",
    lat: 17.4350,
    lng: 78.5020,
    cat: "Electricity",
    priority: "critical",
    status: "open",
    reporterName: "Mohd. Ahmed",
    reporterUid: "demo-user-9",
    votes: 45,
    upvoters: [],
    verifiers: ["user-1", "user-2", "user-3", "user-4", "user-5"],
    isVerified: true,
    imageUrl: imgTransformer,
    time: 1782884400000, // 6/30/2026
    aiAnalysis: "🤖 Gemini Diagnostic Audit:\n- FAILURE CAUSE: Vandalism and cable theft attempt.\n- MUNICIPAL DEPT: TSSPDCL Operations & Safety.\n- CITIZEN DIRECTIVE: Do not go within 5 meters of the transformer fence. Keep umbrellas away from low wires.",
    authority: "Southern Power Distribution Company (TSSPDCL)",
    priorityJustification: "Immediate lethal electrocution risk in a high-density transit area. Potential for fire breakout.",
    immediateCitizenSafetyAction: "Cordon off the area with yellow tape if available. Alert local shops to keep customers away.",
    logs: [
      { text: "Issue reported by Mohd. Ahmed.", by: "Mohd. Ahmed", time: "6/30/2026, 9:00:00 AM", timestamp: 1782884400000 },
      { text: "Power supply to the sector isolated for safety.", by: "System", time: "6/30/2026, 9:20:00 AM", timestamp: 1782885600000 }
    ]
  },
  {
    id: "demo-10",
    title: "Clogged stormwater drain causing road stagnation",
    desc: "The primary stormwater inlet is choked with plastic and silt. Even after a light drizzle, water stagnates for hours, creating a breeding ground for mosquitoes and making the road slippery.",
    loc: "Banjara Hills Road No. 12, Near Star Hospital",
    locality: "Banjara Hills",
    lat: 17.4150,
    lng: 78.4410,
    cat: "Infrastructure",
    priority: "medium",
    status: "open",
    reporterName: "Sameer Varma",
    reporterUid: "demo-user-10",
    votes: 12,
    upvoters: [],
    verifiers: [],
    isVerified: false,
    imageUrl: imgManhole,
    time: 1782888000000, // 6/30/2026
    aiAnalysis: "🤖 Gemini Diagnostic Audit:\n- FAILURE CAUSE: Accumulation of plastic debris and construction runoff.\n- MUNICIPAL DEPT: Entomology & Sanitation Wing.\n- CITIZEN DIRECTIVE: Report the building construction site nearby for silt runoff. Wear mosquito repellent.",
    authority: "Municipal Sanitation & Entomology Dept",
    priorityJustification: "Long-term health risk due to mosquito breeding (Dengue/Malaria). Road safety hazard for two-wheelers.",
    immediateCitizenSafetyAction: "Avoid walking through stagnant water. Report any visible mosquito swarms to the health officer.",
    logs: [
      { text: "Issue reported by Sameer Varma.", by: "Sameer Varma", time: "6/30/2026, 10:00:00 AM", timestamp: 1782888000000 }
    ]
  }
];

export const INITIAL_COMMUNITY_MESSAGES: CommunityMessage[] = [
  {
    id: "msg-1",
    locality: "Old Bowenpally",
    name: "Arun Kumar",
    uid: "demo-user-1",
    text: "Does anyone know if the HMWS&SB team has arrived to inspect the flooded sewer line near Market Road? It's getting wider today.",
    timeString: "10:30 AM",
    timestamp: Date.now() - 7200000,
    likes: 6,
    likers: []
  },
  {
    id: "msg-2",
    locality: "Old Bowenpally",
    name: "Srinivas (Local Lead)",
    uid: "demo-coord-1",
    text: "📢 Official Notice: I have submitted our verified diagnostic report to the sub-divisional engineer of HMWS&SB. They confirmed that emergency contractors are dispatched and repairs will begin shortly. Thank you all for reporting and upvoting!",
    timeString: "11:15 AM",
    timestamp: Date.now() - 4500000,
    likes: 18,
    likers: [],
    official: true
  }
];

export const CIVIC_PRESETS = [
  {
    id: "preset-pothole",
    title: "Large collapsed asphalt pothole",
    desc: "A massive pothole measuring approximately 4 feet across and 1 foot deep has formed. Steel reinforcement meshes underneath are starting to get exposed, posing an immediate risk of tyre punctures and scooter crashes.",
    loc: "Old Bowenpally Main Road, next to ICICI Bank ATM",
    cat: "Road Damage",
    priority: "high"
  },
  {
    id: "preset-garbage",
    title: "Illegal pile of domestic and organic garbage",
    desc: "The public refuse bin has overflowed completely. Garbage bags are spilling onto the main road, and stray animals are scattering plastic waste across a 30-meter radius. Stench is unbearable and blocking access to commercial shops.",
    loc: "Commercial Street market entrance",
    cat: "Waste Management",
    priority: "medium"
  },
  {
    id: "preset-waterleak",
    title: "Pressurized municipal drinking water leak",
    desc: "The primary underground drinking water distribution pipe has sustained a high-pressure rupture. Clean, treated municipal water is gushing 2 meters high into the air, flooding the residential streets and losing thousands of liters.",
    loc: "Sector-3 Residential Complex Lane 2",
    cat: "Water Leakage",
    priority: "critical"
  },
  {
    id: "preset-streetlight",
    title: "Damaged high-mast street lighting pole",
    desc: "A high-speed vehicle impact has bent the metallic high-mast streetlight pole by 15 degrees. The primary distribution cabling at the base is exposed with naked wires, posing a lethal electrocution risk to pedestrians.",
    loc: "Intersection of Lane 5 and Outer Ring Road",
    cat: "Streetlight",
    priority: "critical"
  }
];

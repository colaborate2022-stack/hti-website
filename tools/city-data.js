/* ============================================================================
   city-data.js  —  everything that differs between the ten city pages
   ----------------------------------------------------------------------------
   Split out of build-city-pages.js so the copy can be reviewed and reworded
   without reading past the templating. The build script is the only consumer.

   HONESTY IS THE DESIGN CONSTRAINT HERE

   HTI has one office - A433 Vashi Plaza, Navi Mumbai - and trainers who
   travel. So exactly one entry below, Mumbai, sets `hq`, and only that page
   carries LocalBusiness schema with a real postal address. Every other city
   gets Service schema with areaServed, and says in its own copy that the
   trainers come from the Navi Mumbai HQ. Ten pages each implying a local
   branch would be both a lie and the fastest way to be read as a doorway
   farm.

   For the same reason no page invents a local client, a local case study or a
   local number. The only figures used are the ones HTI already publishes
   sitewide: trading since 2002, 300,000+ people trained, 410+ cities, 5
   countries, 13+ languages. "410+ cities" is what lets these pages say HTI
   has worked in the reader's city without naming a client HTI may not want
   named.

   FIELDS

   hq      Mumbai only. Switches the schema and the "we are down the road"
           copy.
   market  the paragraph that earns the page its place. What that city's
           hospitality industry is actually made of, and which of those
           problems the programmes are aimed at. A city page that is the
           sitewide copy with the name swapped is a doorway page and will be
           treated as one.
   langs   the languages that city's floor staff are most likely to work in.
           Phrased everywhere as "tell us which one", never as a promise that
           a named trainer is on the bench - HTI has run sessions in 13
           languages, which is not a guarantee of any one of them on any
           given date.
   progs   the shortlist, ordered. The first three are what that city's
           employers are most likely to be buying.
   ========================================================================== */

'use strict';

/* The programme catalogue. Copy follows the navbar's own wording, so someone
   who lands on a city page and someone who uses the dropdown read the same
   promise about the same programme. */
const PROGRAMMES = {
  'hotel-shot':     ['Hotel SHOT', 'Every hotel role &mdash; F&amp;B, front desk, housekeeping, security', '04-hti-hotel-operations-training.jpg'],
  'fort':           ['FORT', 'Receptionists, front office executives, GRE and bell desk', '05-hti-guest-experience-training.jpg'],
  'hotcar':         ['HOT-CAR', 'Housekeeping attendants and floor supervisors', '04-hti-hotel-operations-training.jpg'],
  'kmt':            ['KMT', 'Chefs, sous chefs and kitchen supervisors', '01-hti-hospitality-training-workshop.jpg'],
  'cup':            ['CUP', 'Caretakers of villas, homestays and guesthouses', '07-hti-apht-all-purpose-hospitality-training.jpg'],
  'super':          ['SUPER', 'Waiters, stewards, captains and hostesses', '03-hti-restaurant-team-training.jpg'],
  'support':        ['SUPPORT', 'The same roles, for a restaurant that has not opened yet', '03-hti-restaurant-team-training.jpg'],
  'icedt':          ['ICEDT', 'Counter executives, sales staff and quick-service servers', '08-hti-classroom-training-session.jpg'],
  'icare':          ['iCARE', 'Customer service executives and their supervisors', '05-hti-guest-experience-training.jpg'],
  'vow':            ['Vow to Wow', 'Frontline representatives and team leaders', '05-hti-guest-experience-training.jpg'],
  'ramp':           ['RAMP', 'Restaurant managers and shift supervisors', '06-hti-leadership-development-program.jpg'],
  'mdp':            ['MDP', 'Newly promoted and mid-level managers', '06-hti-leadership-development-program.jpg'],
  'class':          ['CLASS', 'Guest-facing and corporate professionals', '02-hti-training-session-hospitality-team.jpg'],
  'post':           ['POST', 'Corporate pantry staff and attendants', '08-hti-classroom-training-session.jpg'],
  'top':            ['TOP', 'Peons, office boys and support staff', '08-hti-classroom-training-session.jpg'],
  'posh-training':  ['POSH Training', 'One day on the POSH Act, 2013 &mdash; staff, managers and ICC members', '02-hti-training-session-hospitality-team.jpg'],
  'fssai-training': ['FSSAI Training', 'Food handlers and Food Safety Supervisors', '07-hti-apht-all-purpose-hospitality-training.jpg']
};

const CITIES = [
  {
    slug: 'mumbai',
    city: 'Mumbai',
    region: 'Maharashtra',
    also: 'Navi Mumbai, Thane and the wider MMR',
    hq: true,
    title: 'Hospitality Training in Mumbai | Hotel &amp; Restaurant Staff | HTI',
    desc: 'On-site hospitality training in Mumbai, Navi Mumbai and Thane. Hotel, restaurant, QSR and office staff trained on your own floor. HTI is headquartered in Vashi.',
    ogHead: 'Hospitality Training in Mumbai',
    ogSub: 'Headquartered in Vashi &mdash; trainers on your floor across MMR',
    lead: 'HTI has been based in Mumbai since 2002. The office is in Vashi, which means a trainer can be standing in your restaurant, hotel or corporate pantry anywhere across the MMR without a flight, a hotel room, or a day lost to getting there.',
    market: 'Mumbai is the hardest hospitality market in the country to staff and the easiest one to lose a guest in. A single kilometre of Lower Parel or Bandra holds a five-star, a standalone fine-dine, four QSR counters and a corporate cafeteria &mdash; all hiring from the same pool, and all training that pool from scratch. Attrition is the tax everyone pays, and it falls hardest on the roles a guest actually meets: the steward, the receptionist, the counter executive. Then there is the commute. Staff who travel ninety minutes each way arrive with nothing left over for the guest unless somebody has taught them how to hold a shift together. That gap is the one HTI was built in, and it is why the programmes run on your own floor rather than in a banquet hall across town.',
    langs: ['Marathi', 'Hindi', 'English'],
    progs: ['super', 'hotel-shot', 'icare', 'ramp', 'fort', 'kmt', 'post', 'fssai-training'],
    faqExtra: {
      q: 'Do you have an office in Mumbai?',
      a: 'Yes. HTI&rsquo;s head office is at A433 Vashi Plaza, Sector 17, Sion Panvel Highway, Vashi, Navi Mumbai 400703. The company has been run from Mumbai since 2002, so a Mumbai booking does not carry trainer travel or accommodation the way a far-flung one does.'
    }
  },
  {
    slug: 'delhi-ncr',
    city: 'Delhi NCR',
    region: 'Delhi',
    also: 'Gurugram, Noida, Faridabad and Ghaziabad',
    title: 'Hospitality Training in Delhi NCR | Hotel &amp; Restaurant Staff | HTI',
    desc: 'On-site hospitality training across Delhi, Gurugram, Noida and Faridabad. Hotel, banquet, restaurant and corporate staff trained at your own property by HTI India.',
    ogHead: 'Hospitality Training in Delhi NCR',
    ogSub: 'Delhi &middot; Gurugram &middot; Noida &middot; Faridabad &mdash; on your own floor',
    lead: 'HTI trainers travel to Delhi, Gurugram, Noida and Faridabad and run the session at your property. Nothing here is delivered over a screen: the programmes are built to be taught where your team already works.',
    market: 'NCR runs on volume. Aerocity and the Gurugram hotel belt turn corporate guests over at a pace that leaves no room for a receptionist who is still learning, and the banqueting trade &mdash; weddings, conferences, the eight-hundred-cover evening &mdash; hires heavily at short notice and expects people to be floor-ready in days. At the other end of the same market sit Cyber City and the Noida office campuses, where the pantry attendant and the front-desk executive are the first company employee a visiting client meets, and where nobody has ever formally trained them. The hotel programmes below are aimed at the first problem and POST and TOP at the second. Both are taught in the language the team actually speaks on shift.',
    langs: ['Hindi', 'English'],
    progs: ['hotel-shot', 'fort', 'post', 'ramp', 'hotcar', 'icare', 'top', 'posh-training']
  },
  {
    slug: 'pune',
    city: 'Pune',
    region: 'Maharashtra',
    also: 'Hinjawadi, Kharadi, Baner and Koregaon Park',
    title: 'Hospitality Training in Pune | Hotel, Cafe &amp; Office Staff | HTI',
    desc: 'On-site hospitality and soft skills training in Pune &mdash; Hinjawadi, Kharadi, Baner and Koregaon Park. Cafe, restaurant, hotel and corporate pantry teams trained by HTI India.',
    ogHead: 'Hospitality Training in Pune',
    ogSub: 'Cafes, business hotels and IT campus teams &mdash; taught on site',
    lead: 'Pune is a road trip from HTI&rsquo;s Navi Mumbai office rather than a flight, which makes it one of the easier cities on this list to schedule &mdash; including the single-day formats that are hard to justify when a trainer has to fly.',
    market: 'Pune&rsquo;s hospitality demand is shaped by two things that barely overlap. There is the IT corridor &mdash; Hinjawadi, Kharadi, Magarpatta &mdash; where cafeterias, pantries and visitor desks are staffed by people hired for reliability rather than for guest contact, then handed the most guest-facing job in the building. And there is the cafe and casual-dining scene around Koregaon Park, Baner and FC Road, largely owner-run, where the difference between a full house and an empty one is a server who knows the menu and can read a table. Business hotels sit between the two, running corporate check-ins on weekdays and weddings at the weekend with the same front desk. The shortlist below is picked for that split.',
    langs: ['Marathi', 'Hindi', 'English'],
    progs: ['super', 'icare', 'post', 'ramp', 'fort', 'top', 'class', 'fssai-training']
  },
  {
    slug: 'bengaluru',
    city: 'Bengaluru',
    region: 'Karnataka',
    also: 'Whitefield, Electronic City, Indiranagar and Koramangala',
    title: 'Hospitality Training in Bengaluru | Restaurant &amp; Cafe Staff | HTI',
    desc: 'On-site hospitality training in Bengaluru for restaurants, cafes, cloud kitchens, brewpubs and corporate campuses. HTI trainers come to your outlet in Whitefield, Indiranagar or Koramangala.',
    ogHead: 'Hospitality Training in Bengaluru',
    ogSub: 'Restaurants, cloud kitchens and campus cafeterias',
    lead: 'HTI trainers come to your outlet or campus in Bengaluru and run the programme there &mdash; on your floor, with your menu, in front of the team that has to use it tomorrow.',
    market: 'Bengaluru opens restaurants faster than it trains people to run them. Indiranagar, Koramangala and Whitefield add covers every quarter, brewpubs and casual-dining rooms compete on service as much as on food, and the cloud-kitchen model has quietly created a large workforce that never meets a guest but whose mistakes reach one anyway. Meanwhile the campuses at Electronic City and Whitefield run cafeterias and visitor lounges at a scale most hotels would recognise, staffed by teams with no hospitality background at all. Two very different problems, and both come down to the same thing: nobody has ever sat these teams down and taught them the standard. SUPER, iCARE and ICEDT are the three Bengaluru businesses ask about first.',
    langs: ['Kannada', 'Hindi', 'English'],
    progs: ['super', 'icare', 'icedt', 'ramp', 'vow', 'post', 'fssai-training', 'posh-training']
  },
  {
    slug: 'hyderabad',
    city: 'Hyderabad',
    region: 'Telangana',
    also: 'HITEC City, Gachibowli, Banjara Hills and Jubilee Hills',
    title: 'Hospitality Training in Hyderabad | Restaurant &amp; Hotel Staff | HTI',
    desc: 'On-site hospitality training in Hyderabad &mdash; HITEC City, Gachibowli, Banjara Hills. Restaurant, QSR, banquet and hotel teams trained at your own property by HTI India.',
    ogHead: 'Hospitality Training in Hyderabad',
    ogSub: 'Restaurants, banquets and campus teams &mdash; on your own floor',
    lead: 'HTI trainers travel to Hyderabad and run the session at your outlet, hotel or campus. The programme is taught where your team works, not in a rented classroom.',
    market: 'Hyderabad&rsquo;s restaurant business runs on scale in a way few Indian cities do &mdash; large rooms, large kitchens, large parties, and chains operating a dozen outlets under one brand with one standard that has to hold across all of them. That is a training problem before it is a management problem: a standard nobody has been taught is just a document. The banqueting and function trade adds a second layer, with teams assembled for an event and expected to perform at it. HITEC City and Gachibowli add a third, where corporate cafeterias and reception desks carry the company&rsquo;s first impression. RAMP for the people running the floor, SUPER and ICEDT for the people on it, POST for the campuses.',
    langs: ['Telugu', 'Hindi', 'English'],
    progs: ['super', 'ramp', 'icedt', 'icare', 'kmt', 'post', 'fssai-training', 'mdp']
  },
  {
    slug: 'chennai',
    city: 'Chennai',
    region: 'Tamil Nadu',
    also: 'OMR, Guindy, T. Nagar and Nungambakkam',
    title: 'Hospitality Training in Chennai | Hotel &amp; Restaurant Staff | HTI',
    desc: 'On-site hospitality training in Chennai for hotels, restaurants, QSRs and corporate offices along OMR and Guindy. HTI trainers deliver at your own property.',
    ogHead: 'Hospitality Training in Chennai',
    ogSub: 'Hotels, restaurants and the OMR corridor',
    lead: 'HTI trainers come to Chennai and run the programme at your hotel, restaurant or office. Sessions are built around your own service situations rather than a generic deck.',
    market: 'Chennai&rsquo;s hospitality economy leans corporate. Business hotels around Guindy and Nungambakkam fill on weekday travel and empty on Sunday, which puts a particular strain on a front desk that has to be equally good at a rushed 7am checkout and a quiet afternoon. The OMR corridor has built a second city of offices behind it, with cafeterias, guest lounges and visitor desks staffed largely by people hired locally and trained by whoever was on shift before them. And the standalone restaurant trade &mdash; long-running, family-owned, fiercely loyal customer bases &mdash; competes on consistency, which is exactly what breaks when a trained server leaves and nobody wrote down what they knew. FORT, SUPER and POST cover most of what Chennai employers ask for.',
    langs: ['Tamil', 'English', 'Hindi'],
    progs: ['fort', 'super', 'post', 'icare', 'hotel-shot', 'ramp', 'top', 'fssai-training']
  },
  {
    slug: 'kolkata',
    city: 'Kolkata',
    region: 'West Bengal',
    also: 'Park Street, Salt Lake and New Town',
    title: 'Hospitality Training in Kolkata | Hotel &amp; Restaurant Staff | HTI',
    desc: 'On-site hospitality training in Kolkata for heritage hotels, clubs, restaurants and offices in Park Street, Salt Lake and New Town. Delivered at your property by HTI India.',
    ogHead: 'Hospitality Training in Kolkata',
    ogSub: 'Heritage hotels, clubs and Park Street restaurants',
    lead: 'HTI trainers travel to Kolkata and deliver at your hotel, club or restaurant &mdash; on your floor, with your team, in the language they work in.',
    market: 'Kolkata has one of the oldest continuous hospitality traditions in India, and it cuts both ways. Heritage hotels and members&rsquo; clubs hold service standards that were set decades ago and passed down by watching, which works beautifully right up until the people who held them retire and nothing was ever written into a programme. The Park Street and Salt Lake restaurant trade is similarly long-established and similarly informal about how new staff learn. New Town, by contrast, is building offices and hotels from scratch with teams hired from outside the trade entirely. Work here tends to be documentation as much as delivery &mdash; turning what the senior staff know into something a new joiner can actually be taught.',
    langs: ['Bengali', 'Hindi', 'English'],
    progs: ['hotel-shot', 'super', 'fort', 'icare', 'hotcar', 'class', 'post', 'mdp']
  },
  {
    slug: 'goa',
    city: 'Goa',
    region: 'Goa',
    also: 'North and South Goa &mdash; Calangute to Palolem',
    title: 'Hospitality Training in Goa | Resort, Villa &amp; Restaurant Staff | HTI',
    desc: 'On-site hospitality training in Goa for resorts, boutique hotels, villas, homestays and restaurants. Season-ready staff training delivered at your property by HTI India.',
    ogHead: 'Hospitality Training in Goa',
    ogSub: 'Resorts, villas and homestays &mdash; trained before the season',
    lead: 'Goa is an overnight drive from HTI&rsquo;s Navi Mumbai office, and most Goa work gets scheduled before the season rather than during it &mdash; which is the only time a resort has the floor free to train on.',
    market: 'Almost nowhere else in India has Goa&rsquo;s staffing shape: a workforce that doubles for the season and halves again, drawn partly from outside the state, learning the property and the guest at the same time. A resort that spent October hiring is trading in November with a floor of people who have never worked together. Underneath the resorts sits the part of the market nobody trains at all &mdash; the villas, homestays and guesthouses run by a caretaker who is single-handedly the housekeeping department, the front desk and the breakfast service. CUP was written for exactly that person. For larger properties Hotel SHOT covers every department in one programme, which matters when the whole team is new at once.',
    langs: ['Konkani', 'Marathi', 'Hindi', 'English'],
    progs: ['cup', 'hotel-shot', 'hotcar', 'fort', 'super', 'kmt', 'icare', 'fssai-training']
  },
  {
    slug: 'jaipur',
    city: 'Jaipur',
    region: 'Rajasthan',
    also: 'Amer Road, Civil Lines and the Delhi&ndash;Jaipur belt',
    title: 'Hospitality Training in Jaipur | Heritage Hotel &amp; Resort Staff | HTI',
    desc: 'On-site hospitality training in Jaipur for heritage hotels, palace properties, resorts and wedding venues. HTI trainers deliver at your property in the language your team works in.',
    ogHead: 'Hospitality Training in Jaipur',
    ogSub: 'Heritage hotels, resorts and the wedding trade',
    lead: 'HTI trainers travel to Jaipur and run the programme on your property &mdash; which for a heritage hotel matters more than usual, because the service standard is tied to the building it happens in.',
    market: 'Jaipur sells an experience that its staff have to deliver in person, every time, to guests who have paid specifically for it. Heritage and palace properties compete on a kind of service that cannot be improvised, and much of it is carried by long-serving staff who learned it by apprenticeship. The destination-wedding trade layers on a second pattern entirely &mdash; enormous, short, high-stakes events where a property triples its floor with temporary hands who have to look and sound like the rest of the team by day one. Both are the same problem underneath: the standard lives in people&rsquo;s heads and not in a programme. Hotel SHOT, FORT and HOT-CAR are where most Jaipur properties start.',
    langs: ['Hindi', 'English'],
    progs: ['hotel-shot', 'fort', 'hotcar', 'kmt', 'super', 'icare', 'class', 'fssai-training']
  },
  {
    slug: 'ahmedabad',
    city: 'Ahmedabad',
    region: 'Gujarat',
    also: 'SG Highway, Prahlad Nagar and Gandhinagar',
    title: 'Hospitality Training in Ahmedabad | Hotel &amp; Restaurant Staff | HTI',
    desc: 'On-site hospitality training in Ahmedabad and Gandhinagar for business hotels, banquets, restaurants and corporate offices. Delivered at your property by HTI India.',
    ogHead: 'Hospitality Training in Ahmedabad',
    ogSub: 'Business hotels, banquets and corporate floors',
    lead: 'HTI trainers travel to Ahmedabad and Gandhinagar and deliver at your hotel, banquet venue or office, in the language your floor staff work in.',
    market: 'Ahmedabad&rsquo;s hospitality trade is built around business travel and around events, and both are unforgiving in the same way: the guest is there for something else, so service only gets noticed when it fails. Business hotels along SG Highway and out towards Gandhinagar turn corporate stays over at pace, with front desks that handle the same rush every morning. The banquet and function business &mdash; weddings, community events, the very large vegetarian catering operations the city is known for &mdash; assembles teams for a night and expects a standard from them. And the corporate floors behind both run pantries and reception desks staffed by people whose training, if any, came from whoever they replaced. FORT, SUPER and POST are the usual starting points.',
    langs: ['Gujarati', 'Hindi', 'English'],
    progs: ['fort', 'super', 'post', 'icare', 'hotel-shot', 'kmt', 'top', 'fssai-training']
  }
];

/* The hero photograph, per city. HTI's own session photography - there is no
   stock imagery anywhere on this site and a city page is the last place to
   start. They are picked for the setting the page's copy leads with (a
   classroom for the campus-heavy cities, an operations floor for the
   hotel-heavy ones) rather than for the city itself, because a photograph of
   a skyline says nothing about training.

   Only the six large originals are used here. 01 and 06 are 455x320, which is
   fine for a 250px card and visibly soft blown up to a 560px hero. */
const HERO_PHOTOS = {
  'mumbai': '02-hti-training-session-hospitality-team.jpg',
  'delhi-ncr': '04-hti-hotel-operations-training.jpg',
  'pune': '08-hti-classroom-training-session.jpg',
  'bengaluru': '03-hti-restaurant-team-training.jpg',
  'hyderabad': '05-hti-guest-experience-training.jpg',
  'chennai': '08-hti-classroom-training-session.jpg',
  'kolkata': '02-hti-training-session-hospitality-team.jpg',
  'goa': '07-hti-apht-all-purpose-hospitality-training.jpg',
  'jaipur': '04-hti-hotel-operations-training.jpg',
  'ahmedabad': '05-hti-guest-experience-training.jpg'
};

module.exports = { PROGRAMMES, CITIES, HERO_PHOTOS };

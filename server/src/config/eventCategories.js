export const EVENT_CATEGORIES = [
  { name: 'Entertainment', subcategories: ['Concert', 'Music', 'DJ', 'Stand-up comedy', 'Theatre', 'Dance', 'Celebrity events'] },
  { name: 'Sports', subcategories: ['Cricket', 'Football', 'Kabaddi', 'Badminton', 'Marathon', 'Fitness', 'Tournaments'] },
  { name: 'Education', subcategories: ['Workshops', 'Seminars', 'Training', 'Conferences', 'Hackathons', 'Career events'] },
  { name: 'Business', subcategories: ['Networking', 'Business meetups', 'Corporate events', 'Exhibitions', 'Trade shows'] },
  { name: 'Family & Kids', subcategories: ['Kids events', 'Magic shows', 'Puppet shows', 'Art workshops', 'Camps'] },
  { name: 'Food & Lifestyle', subcategories: ['Food festivals', 'Flea markets', 'Food tasting', 'Cooking workshops', 'Lifestyle exhibitions'] },
  { name: 'Cultural', subcategories: ['Temple festivals', 'Cultural programs', 'Traditional events', 'Local festivals'] },
  { name: 'Parties', subcategories: ['DJ nights', 'Theme parties', 'New Year parties', 'Birthday events', 'Private parties'] },
];

export const CATEGORY_NAMES = EVENT_CATEGORIES.map(item => item.name);
export const SUBCATEGORY_NAMES = EVENT_CATEGORIES.flatMap(item => item.subcategories);


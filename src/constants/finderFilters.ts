export interface IFinderSelectFilter {
  /** column name on `finder_items` */
  key:
    | "country"
    | "drinking"
    | "smoking"
    | "gender"
    | "sexuality"
    | "ethnicity"
    | "eyeColor"
    | "hairColor";
  label: string;
  options: string[];
}

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia",
  "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados",
  "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina",
  "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia",
  "Cameroon", "Canada", "Chad", "Chile", "China", "Colombia", "Costa Rica", "Croatia",
  "Cuba", "Cyprus", "Czech Republic", "Denmark", "Dominican Republic", "Ecuador",
  "Egypt", "El Salvador", "Estonia", "Ethiopia", "Fiji", "Finland", "France", "Gabon",
  "Georgia", "Germany", "Ghana", "Greece", "Guatemala", "Guinea", "Haiti", "Honduras",
  "Hong Kong", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland",
  "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kuwait",
  "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Liberia", "Libya", "Liechtenstein",
  "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali",
  "Malta", "Mexico", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco",
  "Mozambique", "Myanmar", "Namibia", "Nepal", "Netherlands", "New Zealand",
  "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman",
  "Pakistan", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines",
  "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saudi Arabia",
  "Senegal", "Serbia", "Singapore", "Slovakia", "Slovenia", "Somalia", "South Africa",
  "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Sweden",
  "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo",
  "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Uganda", "Ukraine",
  "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
];

export const FINDER_SELECT_FILTERS: IFinderSelectFilter[] = [
  { key: "country", label: "Country", options: COUNTRIES },
  {
    key: "drinking",
    label: "Fetish",
    options: ["Never", "Socially", "Regularly", "Prefer not to say"],
  },
  {
    key: "smoking",
    label: "Hard limits",
    options: ["Never", "Occasionally", "Regularly", "Trying to quit", "Prefer not to say"],
  },
  {
    key: "gender",
    label: "Gender",
    options: ["Male", "Female", "Non-binary", "Other"],
  },
  {
    key: "sexuality",
    label: "Sexuality",
    options: ["Straight", "Gay", "Lesbian", "Bisexual", "Pansexual", "Other"],
  },
  {
    key: "ethnicity",
    label: "Ethnicity",
    options: [
      "Asian", "Black", "Hispanic / Latino", "Middle Eastern", "Native American",
      "Pacific Islander", "White", "Mixed", "Other",
    ],
  },
  {
    key: "eyeColor",
    label: "Eye Color",
    options: ["Brown", "Blue", "Green", "Hazel", "Gray", "Amber"],
  },
  {
    key: "hairColor",
    label: "Hair Color",
    options: ["Black", "Brown", "Blonde", "Red", "Gray / White", "Other"],
  },
];

/** maps a select filter key to its `finder_items` column name */
export const FINDER_COLUMN_BY_KEY: Record<IFinderSelectFilter["key"], string> = {
  country: "country",
  drinking: "drinking",
  smoking: "smoking",
  gender: "gender",
  sexuality: "sexuality",
  ethnicity: "ethnicity",
  eyeColor: "eye_color",
  hairColor: "hair_color",
};

export const NEARBY_DISTANCE_MIN = 0;
export const NEARBY_DISTANCE_MAX = 36;
export const NEARBY_DISTANCE_STEP = 1;

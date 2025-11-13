import React, { useEffect, useState, useCallback, useRef } from "react";
import AvailabilityCalendar from "./AvailabilityCalendar";
import {
    BookingData,
    BookingErrors,
    AvailabilityPayload,
    TimeSlot,
} from "../types";
import "../styles/NomadBooking.css";

// Helper to display week label
// Helper to display immersion label
function getImmersionDisplay(value: string) {
    switch (value) {
        case "tudo-arte-jan": return "Tudo E Arte January";
        case "tudo-arte-mar": return "Tudo E Arte March";
        case "soul-centered-entrepreneurship": return "Soul-Centered Entrepreneurship";
        default: return value;
    }
}
function weekLabel(week: string) {
    switch (week) {
        case "dec-week-1": return "Tudo E Arte Week 1 (Nov 30 - Dec 7)";
        case "dec-week-2": return "Tudo E Arte Week 2 (Dec 7 - Dec 14)";
        case "dec-week-3": return "Tudo E Arte Week 3 (Dec 14 - Dec 21)";
        case "dec-week-4": return "Tudo E Arte Week 4 (Dec 21 - Dec 28)";
        case "dec-week-5": return "Tudo E Arte Week 5 (Dec 28 - Jan 4)";
        default: return week;
    }
}

// Azure Functions backend URL configuration
const BACKEND =
    process.env.NODE_ENV === 'production'
        ? "https://nf-bookingform-dev.azurewebsites.net"
        : "http://localhost:7071";

// Country code to display mapping (flag + code only for selected display)
const getCountryDisplay = (countryCode: string): string => {
    const countryMap: { [key: string]: string } = {
        "US": "🇺🇸 +1",
        "DO": "🇩🇴 +1",
        "CO": "🇨🇴 +57",
        "BR": "🇧🇷 +55",
        "MX": "🇲🇽 +52",
        "CA": "🇨🇦 +1",
        "ES": "🇪🇸 +34",
        "FR": "🇫🇷 +33",
        "DE": "🇩🇪 +49",
        "IT": "🇮🇹 +39",
        "GB": "🇬🇧 +44",
        "PT": "🇵🇹 +351",
        "AR": "🇦🇷 +54",
        "CL": "🇨🇱 +56",
        "PE": "🇵🇪 +51",
        "EC": "🇪🇨 +593",
        "CR": "🇨🇷 +506",
        "PA": "🇵🇦 +507",
        "GT": "🇬🇹 +502",
        "NI": "🇳🇮 +505",
        "AF": "🇦🇫 +93",
        "AL": "🇦🇱 +355",
        "DZ": "🇩🇿 +213",
        "AD": "🇦🇩 +376",
        "AO": "🇦🇴 +244",
        "AM": "🇦🇲 +374",
        "AU": "🇦🇺 +61",
        "AT": "🇦🇹 +43",
        "AZ": "🇦🇿 +994",
        "BH": "🇧🇭 +973",
        "BD": "🇧🇩 +880",
        "BY": "🇧🇾 +375",
        "BE": "🇧🇪 +32",
        "BZ": "🇧🇿 +501",
        "BJ": "🇧🇯 +229",
        "BT": "🇧🇹 +975",
        "BO": "🇧🇴 +591",
        "BA": "🇧🇦 +387",
        "BW": "🇧🇼 +267",
        "BN": "🇧🇳 +673",
        "BG": "🇧🇬 +359",
        "BF": "🇧🇫 +226",
        "BI": "🇧🇮 +257",
        "KH": "🇰🇭 +855",
        "CM": "🇨🇲 +237",
        "CV": "🇨🇻 +238",
        "CF": "🇨🇫 +236",
        "TD": "🇹🇩 +235",
        "CN": "🇨🇳 +86",
        "CX": "🇨🇽 +61",
        "CC": "🇨🇨 +61",
        "KM": "🇰🇲 +269",
        "CG": "🇨🇬 +242",
        "CD": "🇨🇩 +243",
        "CK": "🇨🇰 +682",
        "HR": "🇭🇷 +385",
        "CU": "🇨🇺 +53",
        "CY": "🇨🇾 +357",
        "CZ": "🇨🇿 +420",
        "DK": "🇩🇰 +45",
        "DJ": "🇩🇯 +253",
        "DM": "🇩🇲 +1",
        "EG": "🇪🇬 +20",
        "SV": "🇸🇻 +503",
        "GQ": "🇬🇶 +240",
        "ER": "🇪🇷 +291",
        "EE": "🇪🇪 +372",
        "ET": "🇪🇹 +251",
        "FK": "🇫🇰 +500",
        "FO": "🇫🇴 +298",
        "FJ": "🇫🇯 +679",
        "FI": "🇫🇮 +358",
        "GF": "🇬🇫 +594",
        "PF": "🇵🇫 +689",
        "TF": "🇹🇫 +262",
        "GA": "🇬🇦 +241",
        "GM": "🇬🇲 +220",
        "GE": "🇬🇪 +995",
        "GH": "🇬🇭 +233",
        "GI": "🇬🇮 +350",
        "GR": "🇬🇷 +30",
        "GL": "🇬🇱 +299",
        "GD": "🇬🇩 +1",
        "GP": "🇬🇵 +590",
        "GU": "🇬🇺 +1",
        "GY": "🇬🇾 +592",
        "HT": "🇭🇹 +509",
        "HM": "🇭🇲 +672",
        "VA": "🇻🇦 +39",
        "HN": "🇭🇳 +504",
        "HK": "🇭🇰 +852",
        "HU": "🇭🇺 +36",
        "IS": "🇮🇸 +354",
        "IN": "🇮🇳 +91",
        "ID": "🇮🇩 +62",
        "IR": "🇮🇷 +98",
        "IQ": "🇮🇶 +964",
        "IE": "🇮🇪 +353",
        "IM": "🇮🇲 +44",
        "IL": "🇮🇱 +972",
        "JM": "🇯🇲 +1",
        "JP": "🇯🇵 +81",
        "JE": "🇯🇪 +44",
        "JO": "🇯🇴 +962",
        "KZ": "🇰🇿 +7",
        "KE": "🇰🇪 +254",
        "KI": "🇰🇮 +686",
        "KP": "🇰🇵 +850",
        "KR": "🇰🇷 +82",
        "KW": "🇰🇼 +965",
        "KG": "🇰🇬 +996",
        "LA": "🇱🇦 +856",
        "LV": "🇱🇻 +371",
        "LB": "🇱🇧 +961",
        "LS": "🇱🇸 +266",
        "LR": "🇱🇷 +231",
        "LY": "🇱🇾 +218",
        "LI": "🇱🇮 +423",
        "LT": "🇱🇹 +370",
        "LU": "🇱🇺 +352",
        "MO": "🇲🇴 +853",
        "MK": "🇲🇰 +389",
        "MG": "🇲🇬 +261",
        "MW": "🇲🇼 +265",
        "MY": "🇲🇾 +60",
        "MV": "🇲🇻 +960",
        "ML": "🇲🇱 +223",
        "MT": "🇲🇹 +356",
        "MH": "🇲🇭 +692",
        "MQ": "🇲🇶 +596",
        "MR": "🇲🇷 +222",
        "MU": "🇲🇺 +230",
        "YT": "🇾🇹 +262",
        "FM": "🇫🇲 +691",
        "MD": "🇲🇩 +373",
        "MC": "🇲🇨 +377",
        "MN": "🇲🇳 +976",
        "ME": "🇲🇪 +382",
        "MS": "🇲🇸 +1",
        "MA": "🇲🇦 +212",
        "MZ": "🇲🇿 +258",
        "MM": "🇲🇲 +95",
        "NA": "🇳🇦 +264",
        "NR": "🇳🇷 +674",
        "NP": "🇳🇵 +977",
        "NL": "🇳🇱 +31",
        "AN": "🇦🇳 +599",
        "NC": "🇳🇨 +687",
        "NZ": "🇳🇿 +64",
        "NF": "🇳🇫 +672",
        "MP": "🇲🇵 +1",
        "NO": "🇳🇴 +47",
        "OM": "🇴🇲 +968",
        "PK": "🇵🇰 +92",
        "PW": "🇵🇼 +680",
        "PS": "🇵🇸 +970",
        "PG": "🇵🇬 +675",
        "PY": "🇵🇾 +595",
        "PH": "🇵🇭 +63",
        "PN": "🇵🇳 +64",
        "PL": "🇵🇱 +48",
        "PR": "🇵🇷 +1",
        "QA": "🇶🇦 +974",
        "RE": "🇷🇪 +262",
        "RO": "🇷🇴 +40",
        "RU": "🇷🇺 +7",
        "BL": "🇧🇱 +590",
        "SH": "🇸🇭 +290",
        "KN": "🇰🇳 +1",
        "LC": "🇱🇨 +1",
        "MF": "🇲🇫 +590",
        "PM": "🇵🇲 +508",
        "VC": "🇻🇨 +1",
        "WS": "🇼🇸 +685",
        "SM": "🇸🇲 +378",
        "ST": "🇸🇹 +239",
        "SA": "🇸🇦 +966",
        "SN": "🇸🇳 +221",
        "RS": "🇷🇸 +381",
        "SC": "🇸🇨 +248",
        "SL": "🇸🇱 +232",
        "SG": "🇸🇬 +65",
        "SK": "🇸🇰 +421",
        "SI": "🇸🇮 +386",
        "SB": "🇸🇧 +677",
        "SO": "🇸🇴 +252",
        "ZA": "🇿🇦 +27",
        "GS": "🇬🇸 +500",
        "LK": "🇱🇰 +94",
        "SD": "🇸🇩 +249",
        "SR": "🇸🇷 +597",
        "SJ": "🇸🇯 +47",
        "SZ": "🇸🇿 +268",
        "SE": "🇸🇪 +46",
        "CH": "🇨🇭 +41",
        "SY": "🇸🇾 +963",
        "TW": "🇹🇼 +886",
        "TJ": "🇹🇯 +992",
        "TZ": "🇹🇿 +255",
        "TH": "🇹🇭 +66",
        "TL": "🇹🇱 +670",
        "TG": "🇹🇬 +228",
        "TK": "🇹🇰 +690",
        "TO": "🇹🇴 +676",
        "TT": "🇹🇹 +1",
        "TN": "🇹🇳 +216",
        "TR": "🇹🇷 +90",
        "TM": "🇹🇲 +993",
        "TC": "🇹🇨 +1",
        "TV": "🇹🇻 +688",
        "UG": "🇺🇬 +256",
        "UA": "🇺🇦 +380",
        "AE": "🇦🇪 +971",
        "UY": "🇺🇾 +598",
        "UZ": "🇺🇿 +998",
        "VU": "🇻🇺 +678",
        "VE": "🇻🇪 +58",
        "VN": "🇻🇳 +84",
        "VG": "🇻🇬 +1",
        "VI": "🇻🇮 +1",
        "WF": "🇼🇫 +681",
        "EH": "🇪🇭 +212",
        "YE": "🇾🇪 +967",
        "ZM": "🇿🇲 +260",
        "ZW": "🇿🇼 +263",
    };
    return countryMap[countryCode] || `${countryCode} +?`;
};

const getCountryFullName = (countryCode: string): string => {
    const countryFullMap: { [key: string]: string } = {
        "US": "🇺🇸 US +1",
        "DO": "🇩🇴 DO +1",
        "CO": "🇨🇴 CO +57",
        "BR": "🇧🇷 BR +55",
        "MX": "🇲🇽 MX +52",
        "CA": "🇨🇦 CA +1",
        "ES": "🇪🇸 ES +34",
        "FR": "🇫🇷 FR +33",
        "DE": "🇩🇪 DE +49",
        "IT": "🇮🇹 IT +39",
        "GB": "🇬🇧 GB +44",
        "PT": "🇵🇹 PT +351",
        "AR": "🇦🇷 AR +54",
        "CL": "🇨🇱 CL +56",
        "PE": "🇵🇪 PE +51",
        "EC": "🇪🇨 EC +593",
        "CR": "🇨🇷 CR +506",
        "PA": "🇵🇦 PA +507",
        "GT": "🇬🇹 GT +502",
        "NI": "🇳🇮 NI +505",
        "AF": "🇦🇫 AF +93",
        "AL": "🇦🇱 AL +355",
        "DZ": "🇩🇿 DZ +213",
        "AD": "🇦🇩 AD +376",
        "AO": "🇦🇴 AO +244",
        "AM": "🇦🇲 AM +374",
        "AU": "🇦🇺 AU +61",
        "AT": "🇦🇹 AT +43",
        "AZ": "🇦🇿 AZ +994",
        "BH": "🇧🇭 BH +973",
        "BD": "🇧🇩 BD +880",
        "BY": "🇧🇾 BY +375",
        "BE": "🇧🇪 BE +32",
        "BZ": "🇧🇿 BZ +501",
        "BJ": "🇧🇯 BJ +229",
        "BT": "🇧🇹 BT +975",
        "BO": "🇧🇴 BO +591",
        "BA": "🇧🇦 BA +387",
        "BW": "🇧🇼 BW +267",
        "BN": "🇧🇳 BN +673",
        "BG": "🇧🇬 BG +359",
        "BF": "🇧🇫 BF +226",
        "BI": "🇧🇮 BI +257",
        "KH": "🇰🇭 KH +855",
        "CM": "🇨🇲 CM +237",
        "CV": "🇨🇻 CV +238",
        "CF": "🇨🇫 CF +236",
        "TD": "🇹🇩 TD +235",
        "CN": "🇨🇳 CN +86",
        "CX": "🇨🇽 CX +61",
        "CC": "🇨🇨 CC +61",
        "KM": "🇰🇲 KM +269",
        "CG": "🇨🇬 CG +242",
        "CD": "🇨🇩 CD +243",
        "CK": "🇨🇰 CK +682",
        "HR": "🇭🇷 HR +385",
        "CU": "🇨🇺 CU +53",
        "CY": "🇨🇾 CY +357",
        "CZ": "🇨🇿 CZ +420",
        "DK": "🇩🇰 DK +45",
        "DJ": "🇩🇯 DJ +253",
        "DM": "🇩🇲 DM +1",
        "EG": "🇪🇬 EG +20",
        "SV": "🇸🇻 SV +503",
        "GQ": "🇬🇶 GQ +240",
        "ER": "🇪🇷 ER +291",
        "EE": "🇪🇪 EE +372",
        "ET": "🇪🇹 ET +251",
        "FK": "🇫🇰 FK +500",
        "FO": "🇫🇴 FO +298",
        "FJ": "🇫🇯 FJ +679",
        "FI": "🇫🇮 FI +358",
        "GF": "🇬🇫 GF +594",
        "PF": "🇵🇫 PF +689",
        "TF": "🇹🇫 TF +262",
        "GA": "🇬🇦 GA +241",
        "GM": "🇬🇲 GM +220",
        "GE": "🇬🇪 GE +995",
        "GH": "🇬🇭 GH +233",
        "GI": "🇬🇮 GI +350",
        "GR": "🇬🇷 GR +30",
        "GL": "🇬🇱 GL +299",
        "GD": "🇬🇩 GD +1",
        "GP": "🇬🇵 GP +590",
        "GU": "🇬🇺 GU +1",
        "GY": "🇬🇾 GY +592",
        "HT": "🇭🇹 HT +509",
        "HM": "🇭🇲 HM +672",
        "VA": "🇻🇦 VA +39",
        "HN": "🇭🇳 HN +504",
        "HK": "🇭🇰 HK +852",
        "HU": "🇭🇺 HU +36",
        "IS": "🇮🇸 IS +354",
        "IN": "🇮🇳 IN +91",
        "ID": "🇮🇩 ID +62",
        "IR": "🇮🇷 IR +98",
        "IQ": "🇮🇶 IQ +964",
        "IE": "🇮🇪 IE +353",
        "IM": "🇮🇲 IM +44",
        "IL": "🇮🇱 IL +972",
        "JM": "🇯🇲 JM +1",
        "JP": "🇯🇵 JP +81",
        "JE": "🇯🇪 JE +44",
        "JO": "🇯🇴 JO +962",
        "KZ": "🇰🇿 KZ +7",
        "KE": "🇰🇪 KE +254",
        "KI": "🇰🇮 KI +686",
        "KP": "🇰🇵 KP +850",
        "KR": "🇰🇷 KR +82",
        "KW": "🇰🇼 KW +965",
        "KG": "🇰🇬 KG +996",
        "LA": "🇱🇦 LA +856",
        "LV": "🇱🇻 LV +371",
        "LB": "🇱🇧 LB +961",
        "LS": "🇱🇸 LS +266",
        "LR": "🇱🇷 LR +231",
        "LY": "🇱🇾 LY +218",
        "LI": "🇱🇮 LI +423",
        "LT": "🇱🇹 LT +370",
        "LU": "🇱🇺 LU +352",
        "MO": "🇲🇴 MO +853",
        "MK": "🇲🇰 MK +389",
        "MG": "🇲🇬 MG +261",
        "MW": "🇲🇼 MW +265",
        "MY": "🇲🇾 MY +60",
        "MV": "🇲🇻 MV +960",
        "ML": "🇲🇱 ML +223",
        "MT": "🇲🇹 MT +356",
        "MH": "🇲🇭 MH +692",
        "MQ": "🇲🇶 MQ +596",
        "MR": "🇲🇷 MR +222",
        "MU": "🇲🇺 MU +230",
        "YT": "🇾🇹 YT +262",
        "FM": "🇫🇲 FM +691",
        "MD": "🇲🇩 MD +373",
        "MC": "🇲🇨 MC +377",
        "MN": "🇲🇳 MN +976",
        "ME": "🇲🇪 ME +382",
        "MS": "🇲🇸 MS +1",
        "MA": "🇲🇦 MA +212",
        "MZ": "🇲🇿 MZ +258",
        "MM": "🇲🇲 MM +95",
        "NA": "🇳🇦 NA +264",
        "NR": "🇳🇷 NR +674",
        "NP": "🇳🇵 NP +977",
        "NL": "🇳🇱 NL +31",
        "AN": "🇦🇳 AN +599",
        "NC": "🇳🇨 NC +687",
        "NZ": "🇳🇿 NZ +64",
        "NF": "🇳🇫 NF +672",
        "MP": "🇲🇵 MP +1",
        "NO": "🇳🇴 NO +47",
        "OM": "🇴🇲 OM +968",
        "PK": "🇵🇰 PK +92",
        "PW": "🇵🇼 PW +680",
        "PS": "🇵🇸 PS +970",
        "PG": "🇵🇬 PG +675",
        "PY": "🇵🇾 PY +595",
        "PH": "🇵🇭 PH +63",
        "PN": "🇵🇳 PN +64",
        "PL": "🇵🇱 PL +48",
        "PR": "🇵🇷 PR +1",
        "QA": "🇶🇦 QA +974",
        "RE": "🇷🇪 RE +262",
        "RO": "🇷🇴 RO +40",
        "RS": "🇷🇸 RS +381",
        "RU": "🇷🇺 RU +7",
        "RW": "🇷🇼 RW +250",
        "BL": "🇧🇱 BL +590",
        "SH": "🇸🇭 SH +290",
        "KN": "🇰🇳 KN +1",
        "LC": "🇱🇨 LC +1",
        "MF": "🇲🇫 MF +590",
        "PM": "🇵🇲 PM +508",
        "VC": "🇻🇨 VC +1",
        "WS": "🇼🇸 WS +685",
        "SM": "🇸🇲 SM +378",
        "ST": "🇸🇹 ST +239",
        "SA": "🇸🇦 SA +966",
        "SN": "🇸🇳 SN +221",
        "SC": "🇸🇨 SC +248",
        "SL": "🇸🇱 SL +232",
        "SG": "🇸🇬 SG +65",
        "SK": "🇸🇰 SK +421",
        "SI": "🇸🇮 SI +386",
        "SB": "🇸🇧 SB +677",
        "SO": "🇸🇴 SO +252",
        "ZA": "🇿🇦 ZA +27",
        "GS": "🇬🇸 GS +500",
        "LK": "🇱🇰 LK +94",
        "SD": "🇸🇩 SD +249",
        "SR": "🇸🇷 SR +597",
        "SJ": "🇸🇯 SJ +47",
        "SZ": "🇸🇿 SZ +268",
        "SE": "🇸🇪 SE +46",
        "CH": "🇨🇭 CH +41",
        "SY": "🇸🇾 SY +963",
        "TW": "🇹🇼 TW +886",
        "TJ": "🇹🇯 TJ +992",
        "TZ": "🇹🇿 TZ +255",
        "TH": "🇹🇭 TH +66",
        "TL": "🇹🇱 TL +670",
        "TG": "🇹🇬 TG +228",
        "TK": "🇹🇰 TK +690",
        "TO": "🇹🇴 TO +676",
        "TT": "🇹🇹 TT +1",
        "TN": "🇹🇳 TN +216",
        "TR": "🇹🇷 TR +90",
        "TM": "🇹🇲 TM +993",
        "TC": "🇹🇨 TC +1",
        "TV": "🇹🇻 TV +688",
        "UG": "🇺🇬 UG +256",
        "UA": "🇺🇦 UA +380",
        "AE": "🇦🇪 AE +971",
        "UY": "🇺🇾 UY +598",
        "UZ": "🇺🇿 UZ +998",
        "VU": "🇻🇺 VU +678",
        "VE": "🇻🇪 VE +58",
        "VN": "🇻🇳 VN +84",
        "VG": "🇻🇬 VG +1",
        "VI": "🇻🇮 VI +1",
        "WF": "🇼🇫 WF +681",
        "EH": "🇪🇭 EH +212",
        "YE": "🇾🇪 YE +967",
        "ZM": "🇿🇲 ZM +260",
        "ZW": "🇿🇼 ZW +263",
    };
    return countryFullMap[countryCode] || `${countryCode} +?`;
};

export default function NomadBooking() {
    // Helper to get country dial code from countryCode
    const getCountryDialCode = (countryCode: string): string => {
        const dialMap: { [key: string]: string } = {
            "US": "+1", "DO": "+1", "CO": "+57", "BR": "+55", "MX": "+52", "CA": "+1", "ES": "+34", "FR": "+33", "DE": "+49", "IT": "+39", "GB": "+44", "PT": "+351", "AR": "+54", "CL": "+56", "PE": "+51", "EC": "+593", "CR": "+506", "PA": "+507", "GT": "+502", "NI": "+505", "AF": "+93", "AL": "+355", "DZ": "+213", "AD": "+376", "AO": "+244", "AM": "+374", "AU": "+61", "AT": "+43", "AZ": "+994", "BH": "+973", "BD": "+880", "BY": "+375", "BE": "+32", "BZ": "+501", "BJ": "+229", "BT": "+975", "BO": "+591", "BA": "+387", "BW": "+267", "BN": "+673", "BG": "+359", "BF": "+226", "BI": "+257", "KH": "+855", "CM": "+237", "CV": "+238", "CF": "+236", "TD": "+235", "CN": "+86", "CX": "+61", "CC": "+61", "KM": "+269", "CG": "+242", "CD": "+243", "CK": "+682", "HR": "+385", "CU": "+53", "CY": "+357", "CZ": "+420", "DK": "+45", "DJ": "+253", "DM": "+1", "EG": "+20", "SV": "+503", "GQ": "+240", "ER": "+291", "EE": "+372", "ET": "+251", "FK": "+500", "FO": "+298", "FJ": "+679", "FI": "+358", "GF": "+594", "PF": "+689", "TF": "+262", "GA": "+241", "GM": "+220", "GE": "+995", "GH": "+233", "GI": "+350", "GR": "+30", "GL": "+299", "GD": "+1", "GP": "+590", "GU": "+1", "GY": "+592", "HT": "+509", "HM": "+672", "VA": "+39", "HN": "+504", "HK": "+852", "HU": "+36", "IS": "+354", "IN": "+91", "ID": "+62", "IR": "+98", "IQ": "+964", "IE": "+353", "IM": "+44", "IL": "+972", "JM": "+1", "JP": "+81", "JE": "+44", "JO": "+962", "KZ": "+7", "KE": "+254", "KI": "+686", "KP": "+850", "KR": "+82", "KW": "+965", "KG": "+996", "LA": "+856", "LV": "+371", "LB": "+961", "LS": "+266", "LR": "+231", "LY": "+218", "LI": "+423", "LT": "+370", "LU": "+352", "MO": "+853", "MK": "+389", "MG": "+261", "MW": "+265", "MY": "+60", "MV": "+960", "ML": "+223", "MT": "+356", "MH": "+692", "MQ": "+596", "MR": "+222", "MU": "+230", "YT": "+262", "FM": "+691", "MD": "+373", "MC": "+377", "MN": "+976", "ME": "+382", "MS": "+1", "MA": "+212", "MZ": "+258", "MM": "+95", "NA": "+264", "NR": "+674", "NP": "+977", "NL": "+31", "AN": "+599", "NC": "+687", "NZ": "+64", "NF": "+672", "MP": "+1", "NO": "+47", "OM": "+968", "PK": "+92", "PW": "+680", "PS": "+970", "PG": "+675", "PY": "+595", "PH": "+63", "PN": "+64", "PL": "+48", "PR": "+1", "QA": "+974", "RE": "+262", "RO": "+40", "RU": "+7", "RW": "+250", "BL": "+590", "SH": "+290", "KN": "+1", "LC": "+1", "MF": "+590", "PM": "+508", "VC": "+1", "WS": "+685", "SM": "+378", "ST": "+239", "SA": "+966", "SN": "+221", "RS": "+381", "SC": "+248", "SL": "+232", "SG": "+65", "SK": "+421", "SI": "+386", "SB": "+677", "SO": "+252", "ZA": "+27", "GS": "+500", "LK": "+94", "SD": "+249", "SR": "+597", "SJ": "+47", "SZ": "+268", "SE": "+46", "CH": "+41", "SY": "+963", "TW": "+886", "TJ": "+992", "TZ": "+255", "TH": "+66", "TL": "+670", "TG": "+228", "TK": "+690", "TO": "+676", "TT": "+1", "TN": "+216", "TR": "+90", "TM": "+993", "TC": "+1", "TV": "+688", "UG": "+256", "UA": "+380", "AE": "+971", "UY": "+598", "UZ": "+998", "VU": "+678", "VE": "+58", "VN": "+84", "VG": "+1", "VI": "+1", "WF": "+681", "EH": "+212", "YE": "+967", "ZM": "+260", "ZW": "+263"
        };
        return dialMap[countryCode] || "";
    };
    const [countryDropdownOpen, setCountryDropdownOpen] = useState<boolean>(false);
    const [data, setData] = useState<BookingData>({
        firstName: "",
        lastName: "",
        email: "",
        whatsapp: "",
        countryCode: "BR",
        numberOfGuests: "1",
        heardAbout: "",
        heardAboutOther: "",
        firstTime: "",
        roomInterest: "",
        experience: "",
        paymentOption: "",
        alternativePricing: "",
        about: "",
        selectedSlot: null,
        // Add new fields for experience type and option
    });
    const [experienceType, setExperienceType] = useState<string>("");
    const [experienceOption, setExperienceOption] = useState<string>("");
    const [colivingWeeks, setColivingWeeks] = useState<string[]>([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const weekOptions = [
        "dec-week-1",
        "dec-week-2",
        "dec-week-3",
        "dec-week-4",
        "dec-week-5"
    ];

    const [errors, setErrors] = useState<BookingErrors>({});
    const [availability, setAvailability] = useState<AvailabilityPayload | null>(null);
    const [loadingAvail, setLoadingAvail] = useState<boolean>(false);
    const [availError, setAvailError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState<boolean>(false);

    const [viewDate, setViewDate] = useState<Date>(new Date());

    // Stable update function to avoid changing reference every render
    const update = useCallback(<K extends keyof BookingData>(key: K, value: BookingData[K]) => {
        setData((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => {
            if (!prev[key]) return prev;
            const c = { ...prev };
            delete c[key];
            return c;
        });
    }, []);

    const fetchMonthlyAvailability = useCallback(async (year: number, month: number) => {
        setLoadingAvail(true);
        setAvailError(null);
        try {
            // Get user's timezone automatically
            let userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

            // Override for testing/VPN users - you can change this
            // Common US timezones: America/New_York, America/Chicago, America/Denver, America/Los_Angeles
            const timezoneOverride = "America/Mexico_City"; // Mexican Standard Time
            if (timezoneOverride) {
                userTimezone = timezoneOverride;
                console.log("[Booking] Timezone overridden to:", userTimezone);
            }

            const url = `${BACKEND}/api/monthlyAvailability?year=${year}&month=${month}&timezone=${encodeURIComponent(userTimezone)}&_=${Date.now()}`;
            console.log("[Booking] fetchAvailability:", url);
            console.log("[Booking] Using timezone:", userTimezone);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const res = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                }
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                const txt = await res.text();
                console.error("fetch error:", res.status, txt);
                throw new Error(`Server error: ${res.status} - ${txt || 'Unable to load calendar'}`);
            }
            const json: AvailabilityPayload = await res.json();
            console.log("[Booking] availability JSON:", json);
            setAvailability(json);
        } catch (err: any) {
            console.error("[Booking] error fetchMonthlyAvailability:", err);
            setAvailability(null);
            if (err.name === 'AbortError') {
                setAvailError("Request timed out. Please check your connection and try again.");
            } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
                setAvailError("Cannot connect to server. Make sure the backend is running on the same network.");
            } else {
                setAvailError(err.message || "Failed to load availability");
            }
        } finally {
            setLoadingAvail(false);
        }
    }, []);

    useEffect(() => {
        const y = viewDate.getFullYear();
        const m = viewDate.getMonth() + 1;
        fetchMonthlyAvailability(y, m);
    }, [viewDate, fetchMonthlyAvailability]);

    const changeMonth = (direction: number) => {
        setViewDate((prev) => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + direction);
            return newDate;
        });
    };

    // Function to format timezone names for display
    const formatTimezoneDisplay = (timezone: string) => {
        return timezone.replace(/_/g, ' ');
    };

    // Handler for selecting a slot in the calendar
    const handleSlotSelect = (slot: TimeSlot | null) => {
        update("selectedSlot", slot);
    };

    const validate = (): boolean => {
        const e: BookingErrors = {};
        if (!data.firstName.trim()) e.firstName = "Required";
        if (!data.lastName.trim()) e.lastName = "Required";
        if (!data.email.trim()) e.email = "Required";
        if (!data.whatsapp.trim()) e.whatsapp = "Required";
        if (!data.countryCode.trim()) e.countryCode = "Required";
        if (!data.numberOfGuests.trim()) e.numberOfGuests = "Required";
        if (!data.heardAbout.trim()) e.heardAbout = "Required";
        if (data.heardAbout === "Other (Please Specify)" && !data.heardAboutOther?.trim()) {
            e.heardAboutOther = "Please specify how you heard about us";
        }
        if (!data.firstTime.trim()) e.firstTime = "Required";
        if (!data.roomInterest.trim()) e.roomInterest = "Required";
        // New experience type validation
        if (!experienceType) e.experience = "Required";
        if (experienceType === "immersion" && !experienceOption) e.experienceOption = "Required";
        if (experienceType === "coliving" && colivingWeeks.length === 0) e.experienceOption = "Select at least one week";
        if (!data.paymentOption.trim()) e.paymentOption = "Required";
        if (!data.alternativePricing.trim()) e.alternativePricing = "Required";
        if (!data.about.trim()) e.about = "Required";
        if (!data.selectedSlot) e.selectedSlot = "Please pick a time slot";

        // Email validation
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (data.email.trim() && !emailPattern.test(data.email)) {
            e.email = "Please enter a valid email address";
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();

        if (!validate()) {
            console.warn("[Booking] Validation errors:", errors);
            return;
        }

        setSubmitting(true);
        setErrors((prev) => {
            const cp = { ...prev };
            delete cp.form;
            return cp;
        });

        try {
            // Get user's timezone using the same method as the calendar
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

            // Format WhatsApp number as countryCode+phoneNumber (e.g., +558295537516)
            const dialCode = getCountryDialCode(data.countryCode);
            let formattedWhatsapp = data.whatsapp.replace(/\D/g, ""); // remove non-digits
            formattedWhatsapp = formattedWhatsapp.replace(/^0+/, ""); // remove leading zeros
            const whatsappFull = `${dialCode}${formattedWhatsapp}`;

            // Build booking payload
            const bookingDataWithTimezone = {
                ...data,
                whatsapp: whatsappFull,
                userTimezone,
                experienceType: experienceType ? experienceType.charAt(0).toUpperCase() + experienceType.slice(1) : experienceType,
                experienceOption:
                    experienceType === "immersion" ? experienceOption : undefined,
                experience:
                    experienceType === "immersion"
                        ? `Immersion: ${getImmersionDisplay(experienceOption)}`
                        : experienceType === "coliving"
                            ? `Coliving: ${colivingWeeks.map(weekLabel).join(", ")}`
                            : undefined,
                colivingWeeks:
                    experienceType === "coliving" ? colivingWeeks : undefined,
                colivingWeeksCount:
                    experienceType === "coliving"
                        ? `|${colivingWeeks.length}`
                        : undefined,
            };

            // Send booking data to backend, which will forward to Zapier
            const url = `${BACKEND}/api/createBooking`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bookingDataWithTimezone),
            });

            if (!res.ok) {
                const txt = await res.text();
                console.error("createBooking failed:", res.status, txt);
                throw new Error(txt || `HTTP ${res.status}`);
            }

            window.location.href =
                "https://www.nomadfarm.co/tudo-e-arte-2/booking-confirmed";
        } catch (err: any) {
            console.error("[Booking] submit error:", err);
            setErrors((prev) => ({
                ...prev,
                form: err.message || "Submission failed",
            }));
        } finally {
            setSubmitting(false);
        }
    };


    const selectRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleDown = (e: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleDown);
        return () => document.removeEventListener("mousedown", handleDown);
    }, []);

    const weeksRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            if (weeksRef.current && !weeksRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleMouseDown);
        return () => document.removeEventListener("mousedown", handleMouseDown);
    }, []);



    // No local success message; user will be redirected on submit

    return (
        <div className="booking-container">
            <h1>Book Your Call</h1>
            <p className="subtitle">Fill this out to get your call invitation!</p>
            <form onSubmit={handleSubmit}>
                <div className="form-columns">
                    <div className="left-column">
                        <div className="form-group">
                            <label>First Name <span className="required">*</span></label>
                            <input
                                type="text"
                                value={data.firstName}
                                onChange={(e) => update("firstName", e.target.value)}
                                placeholder="Enter your first name"
                            />
                            {errors.firstName && <div className="error-text">{errors.firstName}</div>}
                        </div>

                        <div className="form-group">
                            <label>Last Name <span className="required">*</span></label>
                            <input
                                type="text"
                                value={data.lastName}
                                onChange={(e) => update("lastName", e.target.value)}
                                placeholder="Enter your last name"
                            />
                            {errors.lastName && <div className="error-text">{errors.lastName}</div>}
                        </div>

                        <div className="form-group">
                            <label>Email <span className="required">*</span></label>
                            <input
                                type="email"
                                value={data.email}
                                onChange={(e) => update("email", e.target.value)}
                                placeholder="Enter your email address"
                            />
                            {errors.email && <div className="error-text">{errors.email}</div>}
                        </div>

                        <div className="form-group">
                            <label>WhatsApp <span className="required">*</span></label>
                            <div className="whatsapp-input-container" style={{ display: 'flex', gap: '8px' }}>
                                <div className="custom-country-select">
                                    <div
                                        className="country-code-select"
                                        onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                                        style={{ cursor: 'pointer', position: 'relative' }}
                                    >
                                        {getCountryDisplay(data.countryCode)}
                                        <span style={{
                                            position: 'absolute',
                                            right: '10px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            fontSize: '10px'
                                        }}>▼</span>
                                    </div>
                                    {countryDropdownOpen && (
                                        <div className="custom-country-dropdown">
                                            {[
                                                'BR', 'AD', 'AE', 'AF', 'AL', 'AM', 'AN', 'AO', 'AR', 'AT', 'AU', 'AZ', 'BA', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BN', 'BO', 'BT', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FK', 'FI', 'FJ', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GH', 'GI', 'GL', 'GM', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GY', 'HK', 'HM', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KN', 'KP', 'KR', 'KW', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'ST', 'SV', 'SY', 'SZ', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW'
                                            ].map(code => (
                                                <div
                                                    key={code}
                                                    className="custom-country-option"
                                                    onClick={() => {
                                                        update("countryCode", code as BookingData["countryCode"]);
                                                        setCountryDropdownOpen(false);
                                                    }}
                                                >
                                                    {getCountryFullName(code)}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="tel"
                                    value={data.whatsapp}
                                    onChange={(e) => update("whatsapp", e.target.value)}
                                    placeholder="Enter phone number"
                                    style={{ flex: '1' }}
                                />
                            </div>
                            {errors.whatsapp && <div className="error-text">{errors.whatsapp}</div>}
                            {errors.countryCode && <div className="error-text">{errors.countryCode}</div>}
                        </div>

                        <div className="form-group">
                            <label>Where did you hear about Nomad Farm? <span className="required">*</span></label>
                            <select
                                value={data.heardAbout}
                                onChange={(e) => update("heardAbout", e.target.value)}
                            >
                                <option value="">Select...</option>
                                <option value="Instagram (Nomad Farm page)">Instagram (Nomad Farm page)</option>
                                <option value="Facebook Ad">Facebook Ad</option>
                                <option value="Instagram Ad">Instagram Ad</option>
                                <option value="Google Search">Google Search</option>
                                <option value="Friend or Word of Mouth">Friend or Word of Mouth</option>
                                <option value="Other (Please Specify)">Other (Please Specify)</option>
                            </select>
                            {errors.heardAbout && <div className="error-text">{errors.heardAbout}</div>}
                        </div>

                        {data.heardAbout === "Other (Please Specify)" && (
                            <div className="form-group">
                                <label>Please specify:</label>
                                <input
                                    type="text"
                                    value={data.heardAboutOther || ""}
                                    onChange={(e) => update("heardAboutOther", e.target.value)}
                                    placeholder="Please tell us how you heard about us"
                                />
                                {errors.heardAboutOther && <div className="error-text">{errors.heardAboutOther}</div>}
                            </div>
                        )}



                        <div className="form-group">
                            <label>Is this your first time at Nomad Farm? <span className="required">*</span></label>
                            <select
                                value={data.firstTime}
                                onChange={(e) => update("firstTime", e.target.value)}
                            >
                                <option value="">Select...</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                            </select>
                            {errors.firstTime && <div className="error-text">{errors.firstTime}</div>}
                        </div>

                        <div className="form-group">
                            <label>Room Interest <span className="required">*</span></label>
                            <select
                                value={data.roomInterest}
                                onChange={(e) => update("roomInterest", e.target.value)}
                            >
                                <option value="">Select...</option>
                                <option value="Shared">Shared</option>
                                <option value="Standard">Standard</option>
                                <option value="Plus">Plus</option>
                            </select>
                            {errors.roomInterest && <div className="error-text">{errors.roomInterest}</div>}
                        </div>

                        <div className="form-group">
                            <label>Number of Guests <span className="required">*</span></label>
                            <select
                                value={data.numberOfGuests}
                                onChange={(e) => update("numberOfGuests", e.target.value)}
                            >
                                <option value="1">1</option>
                                <option value="2">2</option>
                            </select>
                            {errors.numberOfGuests && <div className="error-text">{errors.numberOfGuests}</div>}
                            {data.numberOfGuests === "2" && (
                                <div className="helper-text">
                                    If you're sharing your room with someone else, there's a 50% surcharge added to your total.
                                </div>
                            )}
                        </div>

                        {/* Experience Type Select */}
                        <div className="form-group">
                            <label>Are you applying for an immersion or a co-living experience? <span className="required">*</span></label>
                            <select
                                value={experienceType}
                                onChange={e => { setExperienceType(e.target.value); setExperienceOption(""); }}
                            >
                                <option value="">Select...</option>
                                <option value="immersion">Immersion</option>
                                <option value="coliving">Co-living</option>
                            </select>
                            {errors.experienceType && <div className="error-text">{errors.experienceType}</div>}
                        </div>
                        {/* Conditional Experience Option Select */}
                        {experienceType === "immersion" && (
                            <div className="form-group">
                                <label>Which immersion? <span className="required">*</span></label>
                                <select
                                    value={experienceOption}
                                    onChange={e => setExperienceOption(e.target.value)}
                                >
                                    <option value="">Select...</option>
                                    <option value="tudo-arte-jan">Tudo E Arte January</option>
                                    <option value="tudo-arte-mar">Tudo E Arte March</option>
                                    <option value="soul-centered-entrepreneurship">Soul-Centered Entrepreneurship</option>
                                </select>
                                {errors.experienceOption && <div className="error-text">{errors.experienceOption}</div>}
                            </div>
                        )}

                        {experienceType === "coliving" && (
                            <div className="form-group" style={{ position: "relative" }} ref={weeksRef}>
                                <label>Which week(s)? <span className="required">*</span></label>

                                <div
                                    ref={selectRef}
                                    className={`custom-select ${dropdownOpen ? "open" : ""}`}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        if (!dropdownOpen) setDropdownOpen(true);
                                    }}
                                >


                                    {/* Keep chips + placeholder INSIDE the custom-select */}
                                    <div className="chips-container">
                                        {colivingWeeks.map((week) => (
                                            <span key={week} className="custom-select-pill">
                                                {weekLabel(week)}
                                                <button
                                                    type="button"
                                                    className="pill-close"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setColivingWeeks(colivingWeeks.filter((w) => w !== week));
                                                    }}
                                                    aria-label={`Remove ${weekLabel(week)}`}
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}

                                    </div>

                                    <button
                                        type="button"
                                        className="dropdown-arrow"
                                        aria-expanded={dropdownOpen}
                                        aria-label="Toggle weeks menu"
                                        onMouseDown={(e) => {
                                            e.stopPropagation();        // don’t trigger wrapper onClick
                                            setDropdownOpen((v) => !v); // toggle open/close
                                        }}
                                    >
                                        ▼
                                    </button>
                                </div>

                                {dropdownOpen && (
                                    <div className="custom-select-dropdown">
                                        {weekOptions
                                            .filter((w) => !colivingWeeks.includes(w))
                                            .map((w) => (
                                                <div
                                                    key={w}
                                                    className="custom-select-option"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setColivingWeeks((prev) => [...prev, w]);
                                                        setDropdownOpen(true); // explicitly keep it open
                                                    }}
                                                >
                                                    {weekLabel(w)}
                                                </div>
                                            ))}
                                        {weekOptions.filter((w) => !colivingWeeks.includes(w)).length === 0 && (
                                            <div className="custom-select-option muted">All weeks selected</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}


                        <div className="form-group">
                            <label>Would you like to pay in full or in two parts? <span className="required">*</span></label>
                            <select
                                value={data.paymentOption}
                                onChange={(e) => update("paymentOption", e.target.value)}
                            >
                                <option value="">Select...</option>
                                <option value="Full">Full</option>
                                <option value="Half">Half</option>
                            </select>
                            {errors.paymentOption && <div className="error-text">{errors.paymentOption}</div>}
                        </div>

                        <div className="form-group">
                            <label>Do you want to apply for alternative pricing? <span className="required">*</span></label>
                            <select
                                value={data.alternativePricing}
                                onChange={(e) => update("alternativePricing", e.target.value)}
                            >
                                <option value="">Select...</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                            </select>
                            {errors.alternativePricing && <div className="error-text">{errors.alternativePricing}</div>}
                            <div className="helper-text">
                                Available for guests earning in currencies with different average income levels.
                            </div>
                        </div>

                        <div className="form-group">
                            <label>About You <span className="required">*</span></label>
                            <textarea
                                value={data.about}
                                onChange={(e) => update("about", e.target.value)}
                                placeholder="Tell us a little bit about yourself and what brings you to Nomad Farm"
                            />
                            {errors.about && <div className="error-text">{errors.about}</div>}
                        </div>

                        {errors.form && <div className="error-text">{errors.form}</div>}
                    </div>

                    <div className="right-column">
                        <div className="calendar-header">Let's schedule a chat</div>

                        <div className="calendar-nav">
                            <button type="button" className="nav-button" onClick={() => changeMonth(-1)}>
                                ←
                            </button>
                            <div className="month-year">
                                {viewDate.toLocaleString("default", {
                                    month: "long",
                                })}{" "}
                                {viewDate.getFullYear()}
                            </div>
                            <button type="button" className="nav-button" onClick={() => changeMonth(1)}>
                                →
                            </button>
                        </div>

                        {loadingAvail && <p className="calendar-loading">Loading availability…</p>}
                        {availError && <p className="calendar-error">{availError}</p>}

                        {!loadingAvail && availability && (
                            <>
                                <AvailabilityCalendar
                                    availability={availability}
                                    selectedSlot={data.selectedSlot}
                                    onSlotSelect={handleSlotSelect}
                                />
                                {errors.selectedSlot && (
                                    <div className="error-text">{errors.selectedSlot}</div>
                                )}
                                <div className="tz-note">
                                    Times in: <strong>{formatTimezoneDisplay(Intl.DateTimeFormat().resolvedOptions().timeZone)}</strong>
                                </div>
                            </>
                        )}

                        <button type="submit" disabled={submitting}>
                            {submitting ? "Submitting…" : "BOOK NOW"}
                        </button>
                    </div>
                </div>
            </form >
        </div >
    );
}

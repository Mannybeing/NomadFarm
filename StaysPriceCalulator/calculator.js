// 📅 Convert a string date to Date object
function parseDate(dateStr) {
    return new Date(dateStr + 'T00:00:00');
}
function normalizeDate(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
// 🔍 Check if a date is in high season
function isHighSeason(date) {
    date = normalizeDate(date);
    const ranges = [
        [normalizeDate(new Date(2025, 11, 15)), normalizeDate(new Date(2026, 1, 28))]
    ];
    return ranges.some(([start, end]) => date >= start && date <= end);
}

// 🔍 Check if a date is in base season
function isBaseSeason(date) {
    date = normalizeDate(date);
    const ranges = [
        [normalizeDate(new Date(2025, 10, 2)), normalizeDate(new Date(2025, 11, 14))],
        [normalizeDate(new Date(2026, 2, 1)), normalizeDate(new Date(2026, 4, 3))]
    ];
    return ranges.some(([start, end]) => date >= start && date <= end);
}

// 📆 Get all nights between check-in and check-out
function calculateNights(startDate, endDate) {
    const nights = [];
    const date = new Date(startDate);
    while (date < endDate) {
        nights.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }
    return nights;
}

// 💰 Get markup or discount based on number of nights
function getModifier(nights) {
    if (nights >= 28) {
        if (nights >= 112) return { type: 'discount', value: 0.20 };
        if (nights >= 84) return { type: 'discount', value: 0.18 };
        if (nights >= 70) return { type: 'discount', value: 0.15 };
        if (nights >= 56) return { type: 'discount', value: 0.10 };
        if (nights >= 42) return { type: 'discount', value: 0.05 };
        return { type: 'discount', value: 0 };
    } else {
        if (nights >= 21) return { type: 'markup', value: 0.05 };
        if (nights >= 14) return { type: 'markup', value: 0.15 };
        if (nights >= 7) return { type: 'markup', value: 0.25 };
        if (nights >= 3) return { type: 'markup', value: 0.30 };
        return { type: 'markup', value: 0 };
    }
}

// 🧮 Main function to calculate price
function calculateTotal({ checkIn, checkOut, roomType, isLocal = false }) {
    const nightlyRates = {
        "Shared": { base: 27.14, high: 31.21 },
        "Standard": { base: 37.86, high: 43.54 },
        "Cabin": { base: 48.57, high: 55.86 }
    };

    const checkInDate = parseDate(checkIn);
    const checkOutDate = parseDate(checkOut);
    const nights = calculateNights(checkInDate, checkOutDate);
    const totalNights = nights.length;

    let highNights = 0, baseNights = 0;
    const rates = nightlyRates[roomType];

    // Sum nightly rates with local discount applied per night
    let nightlySum = 0;
    nights.forEach(date => {
        let nightlyRate = 0;
        let season = '';
        if (isHighSeason(date)) {
            highNights++;
            nightlyRate = rates.high;
            season = 'high';
        } else if (isBaseSeason(date)) {
            baseNights++;
            nightlyRate = rates.base;
            season = 'base';
        } else {
            season = 'none';
        }
        if (isLocal) {
            nightlyRate *= 0.75;
        }
        nightlyRate = Math.round(nightlyRate * 100) / 100;
        nightlySum += nightlyRate;
        console.log(
            date.toISOString().slice(0, 10),
            'normalized:', normalizeDate(date).toISOString().slice(0, 10),
            'isHigh:', isHighSeason(date),
            'isBase:', isBaseSeason(date)
        );
    });

    // Apply length-based modifier to the sum
    const modifier = getModifier(totalNights);
    let adjustedTotal = nightlySum;
    if (modifier.type === 'markup') {
        adjustedTotal *= 1 + modifier.value;
    } else if (modifier.type === 'discount') {
        adjustedTotal *= 1 - modifier.value;
    }
    adjustedTotal = Math.round(adjustedTotal * 100) / 100;

    console.log({
        baseNights,
        highNights,
        baseRate: rates.base,
        highRate: rates.high,
        nightlySum,
        modifier,
        adjustedTotal
    });

    return {
        total: adjustedTotal.toFixed(2),
        highNights,
        baseNights,
        totalNights,
        modifier,
        isLocal,
        perNight: (Math.round((adjustedTotal / totalNights) * 100) / 100).toFixed(2)
    };
}

// 🧪 Example test
const result = calculateTotal({
    checkIn: '2025-11-03',
    checkOut: '2025-11-26',
    roomType: 'Shared',
    isLocal: true
});

console.log(result);

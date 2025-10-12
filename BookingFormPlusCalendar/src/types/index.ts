export interface TimeSlot {
    start: string;
    end: string;
}

export interface DayAvailability {
    date: string;        // e.g. "2025-11-03"
    slots: TimeSlot[];
}

export interface AvailabilityPayload {
    timeZone: string;
    days: DayAvailability[];
}

export interface BookingData {
    firstName: string;
    lastName: string;
    email: string;
    whatsapp: string;
    countryCode: string;
    numberOfGuests: string;
    heardAbout: string;
    heardAboutOther?: string;
    mooCode?: string;
    firstTime: string;
    roomInterest: string;
    experience: string;
    paymentOption: string;
    alternativePricing: string;
    about: string;
    workSchedule: string;
    mailingList: boolean;
    selectedSlot: TimeSlot | null;
}

export interface BookingErrors {
    firstName?: string;
    lastName?: string;
    email?: string;
    whatsapp?: string;
    countryCode?: string;
    numberOfGuests?: string;
    heardAbout?: string;
    heardAboutOther?: string;
    mooCode?: string;
    firstTime?: string;
    roomInterest?: string;
    experience?: string;
    paymentOption?: string;
    alternativePricing?: string;
    about?: string;
    workSchedule?: string;
    mailingList?: string;
    selectedSlot?: string;
    form?: string;
}
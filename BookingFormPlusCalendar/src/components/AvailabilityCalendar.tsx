import React from "react";
import "./AvailabilityCalendar.css";
import { AvailabilityPayload, TimeSlot } from "../types";

interface AvailabilityCalendarProps {
    availability: AvailabilityPayload;
    selectedSlot: TimeSlot | null;
    onSlotSelect: (slot: TimeSlot) => void;
}

const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
    availability,
    selectedSlot,
    onSlotSelect
}) => {
    // Only log once when component actually re-renders
    console.log("[AvailabilityCalendar] Rendered once with:", {
        days: availability.days.length,
        selectedSlot,
    });

    // Helper to check if a slot is within allowed hours in Mexico City time
    const isSlotAllowed = (slot: TimeSlot): boolean => {
        const MX_TZ = "America/Mexico_City";
        const startDate = new Date(slot.start);
        const endDate = new Date(slot.end);
        const dayOfWeek = new Date(startDate.toLocaleString("en-US", { timeZone: MX_TZ })).getDay();
        const startHour = new Date(startDate.toLocaleString("en-US", { timeZone: MX_TZ })).getHours();
        const endHour = new Date(endDate.toLocaleString("en-US", { timeZone: MX_TZ })).getHours();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return startHour >= 11 && endHour <= 17; // Weekend: 11–4
        } else {
            return startHour >= 9 && endHour <= 17; // Weekday: 9–5
        }
    };

    const isSlotSelected = (slot: TimeSlot): boolean =>
        selectedSlot !== null &&
        selectedSlot.start === slot.start &&
        selectedSlot.end === slot.end;

    const formatTimeSlot = (slot: TimeSlot): string => {
        const startDate = new Date(slot.start);
        const endDate = new Date(slot.end);
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const start = startDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: userTimezone
        });
        const end = endDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: userTimezone
        });
        return `${start} - ${end}`;
    };

    const formatDayDate = (dateStr: string): string => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString([], {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    const handleSlotClick = (slot: TimeSlot) => {
        onSlotSelect(slot);
    };

    return (
        <div className="availability-calendar">
            {availability.days.map((day) => {
                const filteredSlots = day.slots.filter(isSlotAllowed);
                return (
                    <div key={day.date} className="day-column">
                        <div className="day-header">{formatDayDate(day.date)}</div>
                        <div className="day-slots">
                            {filteredSlots.length > 0 ? (
                                filteredSlots.map((slot, index) => (
                                    <button
                                        key={`${day.date}-${index}`}
                                        type="button"
                                        className={`time-slot-button ${isSlotSelected(slot) ? 'selected' : ''}`}
                                        onClick={() => handleSlotClick(slot)}
                                        aria-label={`Book slot ${formatTimeSlot(slot)} on ${formatDayDate(day.date)}`}
                                    >
                                        {formatTimeSlot(slot)}
                                    </button>
                                ))
                            ) : (
                                <div className="no-availability">No availability</div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// 🔒 Memoize to prevent re-rendering unless props actually change
export default React.memo(AvailabilityCalendar);

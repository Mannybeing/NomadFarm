import React from "react";
import "./AvailabilityCalendar.css";
import { AvailabilityPayload, TimeSlot } from "../types";

// Diagnostic: log when AvailabilityCalendar re-renders and why
const renderCount = { current: 0 };

function useRenderDiagnostics(props: any) {
    React.useEffect(() => {
        renderCount.current++;
        // Log prop changes for diagnostics
        console.log(
            `[AvailabilityCalendar] Render #${renderCount.current}`,
            {
                availability: props.availability,
                selectedSlot: props.selectedSlot,
                onSlotSelect: props.onSlotSelect,
            }
        );
    });
}

interface AvailabilityCalendarProps {
    availability: AvailabilityPayload;
    selectedSlot: TimeSlot | null;
    onSlotSelect: (slot: TimeSlot) => void;
}

// Move the slot click handler inside the component and use props.onSlotSelect
const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = React.memo(
    (props) => {
        useRenderDiagnostics(props);
        const { availability, selectedSlot, onSlotSelect } = props;

        // Helper to check if a slot is within allowed hours in Mexico City time
        const isSlotAllowed = (slot: TimeSlot): boolean => {
            const MX_TZ = "America/Mexico_City";
            const startDate = new Date(slot.start);
            const endDate = new Date(slot.end);
            const dayOfWeek = new Date(startDate.toLocaleString("en-US", { timeZone: MX_TZ })).getDay();
            const startHour = new Date(startDate.toLocaleString("en-US", { timeZone: MX_TZ })).getHours();
            const endHour = new Date(endDate.toLocaleString("en-US", { timeZone: MX_TZ })).getHours();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                // Weekend: 11-4 (11:00 to 16:59)
                return startHour >= 11 && endHour <= 17;
            } else {
                // Weekday: 9-5 (9:00 to 16:59)
                return startHour >= 9 && endHour <= 17;
            }
        };

        const isSlotSelected = (slot: TimeSlot): boolean =>
            selectedSlot !== null &&
            selectedSlot.start === slot.start &&
            selectedSlot.end === slot.end;

        const formatTimeSlot = (slot: TimeSlot): string => {
            // Convert UTC times to user's local timezone for display
            const start = new Date(slot.start);
            const end = new Date(slot.end);
            return `${start.toLocaleString()} - ${end.toLocaleString()}`;
        };

        // Helper to format day date (add this if missing)
        const formatDayDate = (dateStr: string): string => {
            const date = new Date(dateStr);
            return date.toLocaleDateString();
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
    }
);

export default React.memo(AvailabilityCalendar);

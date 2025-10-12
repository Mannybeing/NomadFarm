import { calculateTotal } from 'backend/priceCalculator.jsw';

$w.onReady(function () {
    $w('#calculateButton').onClick(async () => {
        const checkIn = $w('#checkInInput').value;
        const checkOut = $w('#checkOutInput').value;
        const roomType = $w('#roomTypeDropdown').value;
        const isLocal = $w('#isLocalCheckbox').checked;

        try {
            const result = await calculateTotal({ checkIn, checkOut, roomType, isLocal });
            $w('#totalText').text = `Total: $${result.total} (${result.totalNights} nights)`;
            $w('#totalText').show();
        } catch (err) {
            $w('#totalText').text = 'Error: ' + err.message;
            $w('#totalText').show();
        }
    });
});

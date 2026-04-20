export const formatToPH = (date) => {
    return new Date(date).toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
};
export const formatISO_PH = (date) => {
    const d = new Date(date);
    return new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Manila',
        hour12: false
    }).format(d).replace(' ', 'T');
};

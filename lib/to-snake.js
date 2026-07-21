export const toSnake = (s) => s.replace(/([A-Z])/g, (m, c, i) => (i ? '_' : '') + c.toLowerCase());

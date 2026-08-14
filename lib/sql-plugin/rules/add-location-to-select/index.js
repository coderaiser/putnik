export const report = () => `Add 'start_line', 'start_col' to select`;

export const replace = () => ({
    'section("@select", select(name))': 'section("@select", select(name, start_line, start_col))',
});

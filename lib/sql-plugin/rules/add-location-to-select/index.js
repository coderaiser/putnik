export const report = () => `Add 'start_line', 'start_col' to select`;

export const replace = () => ({
    'section("@select", select(name))': 'section("@select", select(name, start_line, start_col))',
    'section("@select", select(__a, from(__b), where(__c)))': 'section("@select", select(__a, start_line, start_col, from(__b), where(__c)))',
});

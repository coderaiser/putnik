export const report = () => `Add 'start_line', 'start_col' to select`;

export const replace = () => ({
    'section("@select", select(name))': 'section("@select", select(name, start_line, start_col))',
    'section("@select", select(__a, from(__args), where(__args)))': 'section("@select", select(__a, start_line, start_col, from(__args), where(__args)))',
});

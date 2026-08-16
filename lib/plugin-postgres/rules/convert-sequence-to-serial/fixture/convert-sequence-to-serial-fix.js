[
    createTable(users, [
        column(id, serial(), primaryKey()),
        column(name, TEXT),
    ]),
];

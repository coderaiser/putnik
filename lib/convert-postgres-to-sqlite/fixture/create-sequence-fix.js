[
    createSequence(users_id_seq),
    createTable(users, [
        column(id, INTEGER, primaryKey()),
    ]),
];

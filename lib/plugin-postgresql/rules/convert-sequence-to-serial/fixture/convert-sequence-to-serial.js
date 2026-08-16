[
    createSequence(users_id_seq),
    createTable(users, [
        column(id, INTEGER, nextval(users_id_seq), primaryKey()),
        column(name, TEXT),
    ]),
];
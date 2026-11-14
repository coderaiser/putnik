section('@select', select('*', from(users, join(others, on(others.id === users.id)), where(users.file === ':file'))));

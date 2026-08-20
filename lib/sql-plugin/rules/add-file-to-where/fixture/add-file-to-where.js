section('@select', select('*', from(users, where(kind === 'const'))));

section('@select', select('*', from(users, where(kind === 'const' && file === ':file'))));

section('@select', select('*', from(users, where(file === ':file' && kind === 'const'))));

section('@select', select('*', from(users, where(file === ':file'))));

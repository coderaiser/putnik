foo(select('*', from(users, where(kind === 'const'))));

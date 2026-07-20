let _id = 0;

export const nextId = () => {
    ++_id;
    return _id;
};

export const fetchMock = jest.fn(() => Promise.resolve(
    {   
        json: () => Promise.resolve({ token: 'some-token' }),
        status: 200,
        headers: { 'Content-type': 'application/json' },
    })
);
export const localStorageMocks = {
    localStorageMock: {} as Record<string, any>,
    getItem: jest.fn(function(key: string){return this.localStorageMock[key]}),
    setItem: jest.fn(function(key: string, value: string){
        this.localStorageMock[key] = value;
    }),
    clear: jest.fn(function(){
        this.localStorageMock = {};
    })
}
export const sessionStorageMocks = {
    localStorageMock: {} as Record<string, any>,
    getItem: jest.fn(function(key: string){return this.sessionStorageMock[key]}),
    setItem: jest.fn(function(key: string, value: string){
        this.sessionStorageMock[key] = value;
    }),
    clear: jest.fn(function(){
        this.sessionStorageMock = {};
    })
}
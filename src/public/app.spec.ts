import { ErrorLogger, ErrorReport, getBrowser, timestamp, delay, cache, checkCache } from './app';

describe('ErrorLogger: Helper functions', () => {

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('Test if delay delays the proper amount', async () => {
        jest.setTimeout(50000);
        jest.spyOn(global, 'setTimeout');
        await delay(2);
        expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 400);
    });

    describe('getBrowser tests', () => {

        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('returns Firefox browser with version', () => {
            jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0');
            expect(getBrowser()).toBe('Firefox v91.0');
          });
        
        test('returns Edge browser with version', () => {
            jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36 Edg/90.0.818.42');
            expect(getBrowser()).toBe('Edge v90.0.818.42');
        });
        
        test('returns Chrome browser with version', () => {
            jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36');
            expect(getBrowser()).toBe('Chrome v90.0.4430.93');
        });
    
        test('returns Safari browser with version', () => {
            jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh; Intel Mac OS X 13_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15');
            expect(getBrowser()).toBe('Safari v605.1.15');
        });
    
        test('returns unknown browser', () => {
            jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('lambda string');
            expect(getBrowser()).toBe('unknown');
        });
    
        test('throws error if unable to retrieve browser', () => {
            jest.spyOn(window.navigator, 'userAgent', 'get').mockImplementation(jest.fn(undefined));
            expect(() => getBrowser()).toThrow('Couldn\'t retrieve browser');
        });
    });

    describe('timestamp', () => {

        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('returns a number', () => {
            expect(typeof timestamp()).toBe('number');
          });
        
        test('returns a timestamp that equals current time', () => {
            expect(timestamp()/1000).toBeCloseTo(new Date().getTime()/1000);
        });
    
        test('throws error if unable to retrieve date', () => {
            jest.spyOn(Date.prototype, 'getTime').mockImplementation(() => {
                throw new Error('Fake error');
            });
            expect(() => timestamp()).toThrow('Couldn\'t retrieve date');
        });
    });

    describe('cache & checkCache', () => {

        // on mocking storage: https://github.com/facebook/jest/issues/6798

        let storage: {[key: string]: any} = {};

        beforeAll(() => {
            jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => storage[key]);
            jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value:string) => storage[key]=value);
        })

        afterEach(() => {
            storage = {};
            jest.clearAllMocks();
        });

        afterAll(() => {
            jest.restoreAllMocks();
        })

        const error = new Error();
        error.message = 'lambda error';

        test('cache: caches new error', () => {
            cache(error);
            const cachedErrors = localStorage.getItem('errorCache');
            if (cachedErrors) {
                expect(JSON.parse(cachedErrors).find((item:Error) => item.message === 'lambda error'));
            } else {
                throw new Error();
            }
        });

        describe('checkCache', () => {

            const mockSend = jest.fn(async () => {Promise.resolve()});

            const cachedErrors = [
                { message: 'Error 1'},
                { message: 'Error 2'},
            ];

            beforeEach(() => {
                localStorage.setItem('errorCache', JSON.stringify(cachedErrors));  
            });

            afterEach(() => {
                localStorage.clear();
            });

            test('call send on each error in localStorage', () => {

                checkCache(mockSend).then(() => {
                    expect(mockSend).toHaveBeenCalledTimes(cachedErrors.length);
                    expect(mockSend).toHaveBeenCalledWith(cachedErrors[0]);
                    expect(mockSend).toHaveBeenCalledWith(cachedErrors[1]);
                });

            });

            test('should empty array', () => {

                checkCache(mockSend).then(() => {
                    expect(JSON.parse(localStorage.getItem('errorCache')!)).toBe([]);
                });

            })

            test('should cache errors if send function fails', () => {

                const mockSend = jest.fn(() => Promise.reject());

                checkCache(mockSend).then(() => {
                    const newCachedErrors = JSON.parse(localStorage.getItem('errorCache')!);
                    expect(newCachedErrors).toEqual(cachedErrors);
                });
                
            });

        });

    });

});
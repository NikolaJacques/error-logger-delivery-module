"use strict";
/* import { ErrorLogger, ErrorReport, getBrowser, timestamp, delay, cache, checkCache, fetchDataInit, fetchDataSend, backOff } from './app';
import { ActionType } from 'intersection';

describe('ErrorLogger: Helper functions', () => {

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('delay and exponential backoff', () => {

        test('delays the proper amount', async () => {
            jest.spyOn(global, 'setTimeout');
            await delay(2);
            expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 400);
        });
    
        const callback = jest.fn((status: number) => Promise.resolve({status})) as jest.Mock<Promise<Response>>;
    
        jest.mock('./app', () => {
            return {
                ...jest.requireActual('./app'),
                delay: jest.fn(() => Promise.resolve())
            }
        });

        test('backs off for incorrect status', () => {
    
            backOff(() => callback(401))
                .then(() => expect(callback).toBeCalledTimes(10))
                .catch(err => console.log('backoff test 1 error: ', err));
    
        });
    
        test('doesn\'t back off for ok status', () => {
            
            backOff(() => callback(401))
                .then(() => expect(callback).toBeCalledTimes(1))
                .catch(err => console.log('backoff test 2 error: ', err));
    
        });

        jest.unmock('./app');

    });

    describe('getBrowser tests', () => {

        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('returns Firefox browser with version', () => {
            jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0');
            expect(getBrowser()).toStrictEqual('Firefox v91.0');
          });
        
        test('returns Edge browser with version', () => {
            jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36 Edg/90.0.818.42');
            expect(getBrowser()).toStrictEqual('Edge v90.0.818.42');
        });
        
        test('returns Chrome browser with version', () => {
            jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36');
            expect(getBrowser()).toStrictEqual('Chrome v90.0.4430.93');
        });
    
        test('returns Safari browser with version', () => {
            jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh; Intel Mac OS X 13_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15');
            expect(getBrowser()).toStrictEqual('Safari v605.1.15');
        });
    
        test('returns unknown browser', () => {
            jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('lambda string');
            expect(getBrowser()).toStrictEqual('unknown');
        });
    
        test('throws error if unable to retrieve browser', () => {
            jest.spyOn(window.navigator, 'userAgent', 'get').mockImplementation(jest.fn(undefined));
            expect(() => getBrowser()).toThrow('Couldn\'t retrieve browser');
        });
    });

    describe('timestamp', () => {

        afterAll(() => {
            jest.restoreAllMocks();
        });

        test('returns a number', () => {
            expect(typeof timestamp()).toStrictEqual('number');
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

            const mockSend = jest.fn(async () => Promise.resolve());

            const cachedErrors = [
                { message: 'Error 1'},
                { message: 'Error 2'},
            ];

            beforeEach(() => {
                localStorage.setItem('errorCache', JSON.stringify(cachedErrors));
            });

            afterEach(() => {
                jest.restoreAllMocks();
                localStorage.clear();
            });

            test('call send on each error in localStorage', () => {

                checkCache(mockSend)
                    .then(() => {
                        expect(mockSend).toHaveBeenCalledTimes(cachedErrors.length);
                        expect(mockSend).toHaveBeenCalledWith(cachedErrors[0]);
                        expect(mockSend).toHaveBeenCalledWith(cachedErrors[1]);
                    })
                    .catch(err => console.log(err));

            });

            test('should empty array', () => {

                checkCache(mockSend)
                    .then(() => {
                        expect(JSON.parse(localStorage.getItem('errorCache')!)).toHaveLength(0);
                    })
                    .catch(err => console.log(err));

            });

        });

    });

    describe('fetchDataSend & fetchDataInit', () => {

        global.fetch = jest.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ message: 'Error logged successfully'}),
                status: 200
            } as Response),
        );

        const dummyUrl = 'testDomainName/testRoute';
        const message = 'test message';
        const name = 'test name';
        const stack = 'test stack';
        const actions: ActionType[] = [];
        const browserVersion = 'test version';
        const timestamp = Date.now();
        const errorLog = new ErrorReport(message, name, stack, actions, browserVersion, timestamp);

        afterAll(() => {
            jest.clearAllMocks();
        });

        test('fetchDataSend: fetch is called with correct parameters', async () => {

            await fetchDataSend(dummyUrl, errorLog);

            expect(fetch).toHaveBeenCalledWith(dummyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer null',
                },
                body: JSON.stringify(errorLog),
            });

        });

        const dummyAuthRequest = {appId: "1", appSecret: "someSecret"};

        test('fetchDataInit: fetch is called with correct parameters', async () => {

            await fetchDataInit(dummyUrl, dummyAuthRequest);

            expect(fetch).toHaveBeenCalledWith(dummyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dummyAuthRequest),
            });

        });

    });

});

/* describe('ErrorLogger: main methods', () => {

    global.fetch = jest.fn(() =>
        Promise.resolve({
            json: () => Promise.resolve({ message: 'Error logged successfully'}),
            status: 200
        } as Response),
    ) as jest.Mock<Promise<Response>>;

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('send function', () => {

        const message = 'test message';
        const name = 'test name';
        const stack = 'test stack';
        const actions: ActionType[] = [];
        const browserVersion = 'test version';
        const timestamp = Date.now();

        const errorLog = new ErrorReport(message, name, stack, actions, browserVersion, timestamp);

        test('should send error report', () => {

            jest.mock('./app', () => {
                return {
                    ...jest.requireActual('./app'),
                    fetchDataSend: jest.fn(() => Promise.resolve({message: 'successful'})),
                    fetchDataInit: jest.fn(() => Promise.resolve({message: 'successful', token: 'testTokenString'}))
                }
            });

            ErrorLogger.send(errorLog).then(() => {
                expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/logs$/), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer null',
                    },
                    body: JSON.stringify(errorLog),
                });
            });

            jest.unmock('./app');

        });

    });

}); */ 

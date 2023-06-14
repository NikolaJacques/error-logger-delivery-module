var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export class ErrorReport {
    constructor(message, name, stack, actions, browserVersion, timestamp) {
        this.message = message;
        this.name = name;
        this.stack = stack;
        this.actions = actions;
        this.browserVersion = browserVersion;
        this.timestamp = timestamp;
    }
}
// user agent sniffing (from https://www.seanmcp.com/articles/how-to-get-the-browser-version-in-javascript/)
export const getBrowser = () => {
    try {
        const { userAgent } = navigator;
        if (userAgent.includes('Firefox/')) {
            return `Firefox v${userAgent.split('Firefox/')[1]}`;
        }
        else if (userAgent.includes('Edg/')) {
            return `Edge v${userAgent.split('Edg/')[1]}`;
        }
        else if (userAgent.includes('Chrome/')) {
            return `Chrome v${userAgent.split('Chrome/')[1].split(' ')[0]}`;
        }
        else if (userAgent.includes('Safari/')) {
            return `Safari v${userAgent.split('Safari/')[1]}`;
        }
        else {
            return 'unknown';
        }
    }
    catch (error) {
        throw new Error('Couldn\'t retrieve browser');
    }
};
// timestamp function
export const timestamp = () => {
    try {
        const dateStr = (new Date).getTime();
        return dateStr;
    }
    catch (error) {
        throw new Error('Couldn\'t retrieve date');
    }
};
export const cache = (error) => {
    try {
        const cachedErrors = localStorage.getItem('errorCache') ? JSON.parse(localStorage.getItem('errorCache')) : [];
        cachedErrors.push(error);
        localStorage.setItem('errorCache', JSON.stringify(cachedErrors));
    }
    catch (err) {
        console.log(err);
    }
};
export const delay = (backoffCoefficient) => {
    try {
        return new Promise(resolved => {
            setTimeout(() => {
                resolved();
            }, 100 * backoffCoefficient * backoffCoefficient);
        });
    }
    catch (err) {
        throw err;
    }
};
export const backOff = (callback) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let backoffCoefficient = 0;
        let response = yield callback();
        const result = yield (() => __awaiter(void 0, void 0, void 0, function* () {
            while (response.status > 401 && backoffCoefficient < 10) {
                ++backoffCoefficient;
                yield delay(backoffCoefficient);
                response = yield callback();
            }
            return response;
        }))();
        return result;
    }
    catch (err) {
        throw err;
    }
});
export const fetchDataSend = (url, errorRep) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        return yield fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sessionStorage.getItem('error-log-token'),
            },
            body: JSON.stringify(errorRep)
        });
    }
    catch (err) {
        throw err;
    }
});
export const fetchDataInit = (url, requestBody) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        return yield fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
    }
    catch (err) {
        throw err;
    }
});
export const ErrorLogger = (endpoint_url) => {
    const url = endpoint_url;
    const send = (error) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const LOGS_URI = url + 'logs';
            let errorRep;
            if ('timestamp' in error) {
                errorRep = error;
            }
            else {
                const browser = getBrowser();
                const ts = timestamp();
                const actions = sessionStorage.getItem('actions') ? JSON.parse(sessionStorage.getItem('actions')) : [];
                sessionStorage.setItem('actions', JSON.stringify([]));
                const { message, name, stack } = error;
                errorRep = new ErrorReport(message, name, stack, actions, browser, ts);
            }
            try {
                const response = yield backOff(() => fetchDataSend(LOGS_URI, errorRep));
                if (!response.ok)
                    throw new Error('Unable to send error');
                const parsedData = yield response.json();
                console.log(parsedData.message);
            }
            catch (err) {
                cache(errorRep);
                throw err;
            }
        }
        catch (err) {
            console.log(err);
        }
    });
    const checkCache = () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const cachedErrors = localStorage.getItem('errorCache') ? JSON.parse(localStorage.getItem('errorCache')) : [];
            localStorage.setItem('errorCache', JSON.stringify([]));
            for (let error of cachedErrors) {
                send(error);
            }
        }
        catch (error) {
            console.log(error);
        }
    });
    const init = (appId) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const AUTH_URI = url + 'auth/app';
            const requestBody = { appId };
            const response = yield backOff(() => fetchDataInit(AUTH_URI, requestBody));
            const parsedData = yield response.json();
            if (response.ok) {
                sessionStorage.setItem('error-log-token', parsedData.token);
            }
            else {
                throw new Error(parsedData.message);
            }
            checkCache();
        }
        catch (error) {
            console.log(error);
        }
    });
    const trace = (handler) => {
        try {
            return (e) => {
                const actions = !sessionStorage.getItem('actions') ? [] : JSON.parse(sessionStorage.getItem('actions'));
                const { target, type } = e;
                const { localName, id, className } = target;
                actions.push({
                    target: {
                        localName,
                        id,
                        className
                    },
                    type
                });
                sessionStorage.setItem('actions', JSON.stringify(actions));
                handler(e);
            };
        }
        catch (error) {
            console.log(error);
        }
    };
    const traceAll = () => {
        try {
            const proxyAEL = new Proxy(new EventTarget().addEventListener, {
                apply: (target, thisArg, args) => {
                    const newHandler = trace(args[1]);
                    const newArgs = [args[0], (e) => newHandler(e)];
                    Reflect.apply(target, thisArg, newArgs);
                }
            });
            EventTarget.prototype.addEventListener = proxyAEL;
        }
        catch (error) {
            console.log(error);
        }
    };
    return {
        init,
        send,
        trace,
        traceAll
    };
};

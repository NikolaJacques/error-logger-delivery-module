import { ErrorLogType } from 'intersection';
import { AuthResponse, AuthRequest } from 'delivery-backend';
import { ActionType } from 'intersection';

export const ErrorLogger = (() => {

    class ErrorReport implements ErrorLogType<number> {
        constructor(
            public message: string,
            public name: string,
            public stack: string,
            public actions: ActionType[],
            public browserVersion: string,
            public timestamp: number
        ){}
    }

    // user agent sniffing (from https://www.seanmcp.com/articles/how-to-get-the-browser-version-in-javascript/)
    const getBrowser = () => {
        try {        
            const { userAgent } = navigator;
            if (userAgent.includes('Firefox/')) {
                return `Firefox v${userAgent.split('Firefox/')[1]}`;
            } else if (userAgent.includes('Edg/')) {
            return `Edge v${userAgent.split('Edg/')[1]}`
            } else if (userAgent.includes('Chrome/')) {
                return `Chrome v${userAgent.split('Chrome/')[1].split(' ')[0]}`
            } else if (userAgent.includes('Safari/')) {
                return `Safari v${userAgent.split('Safari/')[1]}`
            } else {
                return 'unknown';
            }
        }
        catch(error){
            throw new Error('Couldn\'t retrieve browser');
        }
    }
  
    // timestamp function
    const timestamp = ():number => {
        try {
        const dateStr = (new Date).getTime();
        return dateStr;
        }
        catch(error){
        throw new Error('Couldn\'t retrieve date');
        }
    }

    const delay = (backoffCoefficient:number) => { 
        try {
            return new Promise<void>(resolved => {
                setTimeout(() => {
                resolved();
                }, 100 * backoffCoefficient * backoffCoefficient);
            });
        } catch(err:any){
            throw err;
        }
    }

    const url = 'http://localhost:8080/';

    const cache = (error:Error) => {
        try {
            const cachedErrors = localStorage.getItem('errorCache')?JSON.parse(localStorage.getItem('errorCache')!):[];
            cachedErrors.push(error);
            localStorage.setItem('errorCache', JSON.stringify(cachedErrors));
        }
        catch (err) {
            console.log(err);
        }
    }

    const checkCache = () => {
        try {
            const cachedErrors = localStorage.getItem('errorCache')?JSON.parse(localStorage.getItem('errorCache')!):[];
            localStorage.setItem('errorCache', JSON.stringify([]));
            for (let error of cachedErrors){
                send(error)
                    .catch(() => cache(error));
            }
        }
        catch(error){
            console.log(error);
        }
    }

    const send = async (error: ErrorLogType<number> | Error):Promise<void> => {
        try {
            const LOGS_URI = url +'logs';
            let errorRep: ErrorLogType<number> | Error;
            if ('timestamp' in error){
                errorRep = error;
            } else {
                const browser = getBrowser();
                const ts = timestamp();
                const actions = sessionStorage.getItem('actions')?JSON.parse(sessionStorage.getItem('actions')!):[];
                sessionStorage.setItem('actions', JSON.stringify([]));
                const {message, name, stack} = error;
                errorRep = new ErrorReport(message, name, stack as string, actions, browser, ts);
            }
            try {
                const fetchData = async () => await fetch(LOGS_URI, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + sessionStorage.getItem('error-log-token'),
                    },
                    body: JSON.stringify(errorRep as ErrorLogType<number>)
                });
                let backoffCoefficient = 0;
                let response = await fetchData();
                while (response!.status>=400 && backoffCoefficient < 10){
                    ++backoffCoefficient;
                    await delay(backoffCoefficient);
                    response = await fetchData();
                }
                const parsedData = await response.json();
                console.log(parsedData.message);
            }
            catch(err){
                cache(errorRep);
                throw err;
            }
        }
        catch(err){
            console.log(err);
        }
    }

    const init = async (appId:string, appSecret: string):Promise<void> => {
        try {
            const AUTH_URI = url + 'auth/app';
            if (AUTH_URI){
                const fetchData = async () => await fetch(AUTH_URI, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        appId,
                        appSecret
                    } as AuthRequest)
                })
                let backoffCoefficient = 0;
                let response = await fetchData();
                console.log(response.status);
                while (response!.status>=400 && backoffCoefficient < 10){
                    ++backoffCoefficient;
                    await delay(backoffCoefficient);
                    response = await fetchData();
                }
                const parsedData: AuthResponse = await response.json();
                if (response.ok){
                    sessionStorage.setItem('error-log-token', parsedData.token!);
                } else {
                    throw new Error(parsedData.message);
                }
            } else {
                throw new Error('Auth URL not defined');
            }
            checkCache();
        }
        catch(error){
            console.log(error);
        }
    }

    const trace = (handler:Function) => {
        try {
            return (e:Event) => {
                const actions = !sessionStorage.getItem('actions')?[]:JSON.parse(sessionStorage.getItem('actions')!);
                const {target, type} = e;
                const {localName, id, className} = target as Element;
                actions.push({
                    target:{
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
        catch(error){
            console.log(error);
        }
    }

    const traceAll = () => {
        try {
            const proxyAEL = new Proxy(new EventTarget().addEventListener, {
                apply: (target, thisArg, args) => {
                    const newHandler:any = trace(args[1]);
                    const newArgs = [args[0], (e:Event) => newHandler(e)];
                    Reflect.apply(target, thisArg, newArgs);
                }
            });
            EventTarget.prototype.addEventListener = proxyAEL;
        }
        catch(error){
            console.log(error);
        }
    }

    return {
        init,
        send,
        trace,
        traceAll
    }
})();
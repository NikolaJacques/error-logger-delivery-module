import { ErrorLogType } from 'intersection';
import { AuthResponse, AuthRequest } from 'delivery-backend';
import { ActionType } from 'intersection';

export class ErrorReport implements ErrorLogType<number> {
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
    export const getBrowser = () => {
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
    export const timestamp = ():number => {
        try {
            const dateStr = (new Date).getTime();
            return dateStr;
        }
        catch(error){
            throw new Error('Couldn\'t retrieve date');
        }
    }

    export const cache = (error:Error) => {
        try {
            const cachedErrors = localStorage.getItem('errorCache')?JSON.parse(localStorage.getItem('errorCache')!):[];
            cachedErrors.push(error);
            localStorage.setItem('errorCache', JSON.stringify(cachedErrors));
        }
        catch (err) {
            console.log(err);
        }
    }

    export const delay = (backoffCoefficient:number) => {
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

    export const backOff = async (callback: () => Promise<Response>) => {
        try {
            let backoffCoefficient = 0;
            let response = await callback();
            const result = await (async () => {
                while (response!.status>401 && backoffCoefficient < 10){
                    ++backoffCoefficient;
                    await delay(backoffCoefficient);
                    response = await callback();
                }
                return response;
            })();
            return result;
        } catch(err) {
            throw err;
        }
    }

    export const fetchDataSend = async (url: string, errorRep: ErrorLogType<number>) => {
        try{
            return await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + sessionStorage.getItem('error-log-token'),
                },
                body: JSON.stringify(errorRep)
            })
        } catch(err){
            throw err;
        }
    };

    export const fetchDataInit = async (url: string, requestBody: Partial<AuthRequest>) => {
        try{
            return await fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(requestBody)
            })
        } catch(err){
            throw err;
        }
    };

export const ErrorLogger = (server_url:string) => {

    const send = async (error: ErrorLogType<number> | Error):Promise<void> => {
        try {
            const LOGS_URI = server_url +'logs';
            let errorRep: ErrorLogType<number>;
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
                const response = await backOff(() => fetchDataSend(LOGS_URI, errorRep));
                if (!response.ok) throw new Error('Unable to send error');
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

    const checkCache = async ():Promise<void> => {
        try {
            const cachedErrors = localStorage.getItem('errorCache')?JSON.parse(localStorage.getItem('errorCache')!):[];
            localStorage.setItem('errorCache', JSON.stringify([]));
            for (let error of cachedErrors){
                send(error);
            }
        }
        catch(error){
            console.log(error);
        }
    }

    const init = async (url: string, appId:string='placeholder'):Promise<void> => {
        try {
            // endpoint is server url + 'auth/app'
            const requestBody: Partial<AuthRequest> = {appId};
            const response = await backOff(() => fetchDataInit(url, requestBody));
            const parsedData: AuthResponse = await response.json();
            if (response.ok){
                sessionStorage.setItem('error-log-token', parsedData.token!);
            } else {
                throw new Error(parsedData.message);
            }
            checkCache();
        }
        catch(error){
            console.log(error);
        }
    }

    const trace = (handler: (e:Event) => void) => {
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
};
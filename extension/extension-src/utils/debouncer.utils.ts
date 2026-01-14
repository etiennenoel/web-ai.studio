export class DebouncerUtils {
    static debounce(callback: (...args: any[]) => void, timeout: number = 300) {
        let timer: any;

        return (...args: any[]) => {
            clearTimeout(timer);
            timer = setTimeout(() => {callback(...args);}, timeout);
        }
    }
}

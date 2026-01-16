export class ElementAccessor<T extends HTMLElement = HTMLElement> {
    private _element: T | null;

    constructor(elementId: string) {
        this._element = document.getElementById(elementId) as T;
    }

    public get element(): T | null {
        return this._element;
    }

    public get exists(): boolean {
        return !!this._element;
    }

    public setText(value: string): void {
        if (this._element) {
            this._element.textContent = value;
        }
    }

    public setHtml(value: string): void {
        if (this._element) {
            this._element.innerHTML = value;
        }
    }

    public addClass(className: string): void {
        if (this._element) {
            this._element.classList.add(className);
        }
    }

    public removeClass(className: string): void {
        if (this._element) {
            this._element.classList.remove(className);
        }
    }
    
    public clearClasses(): void {
        if (this._element) {
            this._element.className = '';
        }
    }
}

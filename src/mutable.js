import { Library } from '@observablehq/stdlib'
const library = new Library();
const Generators = library.Generators

export function Mutable(initialValue) {
    let currentValue = initialValue;
    const generator = Generators.observe((notify) => {
        notify(currentValue);
        return (newValue) => {
            currentValue = newValue;
            notify(newValue);
        };
    });
    return {
        ...generator,
        get value() {
            return currentValue;
        },
        set value(newValue) {
            currentValue = newValue;
            generator.next(newValue);
        }
    };
}
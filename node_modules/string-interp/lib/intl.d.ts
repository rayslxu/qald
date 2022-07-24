// Intl.ListFormat is not yet part of typescript

declare namespace Intl {
    type ListFormatType = ('conjunction' | 'disjunction');

    interface ListFormatOptions {
        type ?: ListFormatType;
    }

    class ListFormat {
        constructor(locale : string|undefined, options ?: ListFormatOptions);

        format(x : unknown[]) : string;
    }
}

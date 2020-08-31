const pluralize = (word, count) => count === 1 ? word : `${word}s`;
module.exports = {

    clean: (text) => {
        if (typeof(text) === "string") return text.replace(/`/g, "`" + String.fromCharCode(8203))
            .replace(/@/g, "@" + String.fromCharCode(8203));
        else return text;
    },

    ms: (milliseconds) => {
        if (typeof milliseconds !== 'number') {
            throw new TypeError('Expected a number');
        }
        const roundTowardsZero = milliseconds > 0 ? Math.floor : Math.ceil;

	    return {
		    days: roundTowardsZero(milliseconds / 86400000),
		    hours: roundTowardsZero(milliseconds / 3600000) % 24,
		    minutes: roundTowardsZero(milliseconds / 60000) % 60,
		    seconds: roundTowardsZero(milliseconds / 1000) % 60,
		    milliseconds: roundTowardsZero(milliseconds) % 1000,
		    microseconds: roundTowardsZero(milliseconds * 1000) % 1000,
		    nanoseconds: roundTowardsZero(milliseconds * 1e6) % 1000
        };
    },

    parsems: (str, startTime = Date.now()) => {
        const dateRegex = /(?:(?:j(?:u[ln]|an)|(?:sep|oc)t|a(?:pr|ug)|ma[ry]|dec|feb|nov)|(\d+[/-]){2}\d+)/i
        if (dateRegex.test(str)) {
            const now = new Date();
            const date = new Date(str);

            if (date.toString() === 'Invalid Date') throw 'Invalid Date'
            if (date.getFullYear() === 2001) date.setFullYear(now.getFullYear());
            if (date < now) throw 'Date before current';

            return date;
        } else {

            const d = `(${str.includes('.') ? '[\\d.]': '\\d'}+)`;
            const months = /\dm\d.*[wdhm](\d|$)|month/i.test(str);
            const inputRegex = months ? new RegExp(`^(?:${d}(?:m|months?))?(?:${d}(?:w|weeks?))?(?:${d}(?:d|days?))?(?:${d}(?:h|hrs?|hours?))?(?:${d}(?:m|mins?|minutes?))?(?:${d}(?:s|secs?|seconds?))?$`) :
                new RegExp(`(?:${d}([a-z]+))`, 'g');

            str = str.replace(/ +/g, '')
                .toLowerCase();
            let m = inputRegex.exec(str);

            if (!m) throw 'Invalid Input'

            let s = 0
            const times = [2.592e+6, 604800, 86400, 3600, 60, 1];

            if (months) m.slice(1)
                .forEach((x, i) => x && (s += (times[i] * x) | 0));
            else {
                const names = ['week', 'day', ['hr', 'hour'], 'minute', 'second'];
                const groups = m.slice(1);
                while (m = inputRegex.exec(str)) groups.push(...m.slice(1));

                for (var i = 0; i < groups.length; i += 2) {
                    const index = names.findIndex(x => Array.isArray(x) ? x.find(r => r.startsWith(groups[i + 1])) : x.startsWith(groups[i + 1]));
                    if (index === -1) throw `Invalid time value: ${groups[i + 1]}`;
                    s += times[index + 1] * groups[i];
                }
            }

            if (s < 0) throw 'Time value too large'
            return s * 1000;

        }
    },

    parseDate: (str, startTime = Date.now()) => {
        const dateRegex = /(?:(?:j(?:u[ln]|an)|(?:sep|oc)t|a(?:pr|ug)|ma[ry]|dec|feb|nov)|(\d+[/-]){2}\d+)/i
        if (dateRegex.test(str)) {
            const now = new Date();
            const date = new Date(str);

            if (date.toString() === 'Invalid Date') throw 'Invalid Date'
            if (date.getFullYear() === 2001) date.setFullYear(now.getFullYear());
            if (date < now) throw 'Date before current';

            return date;
        } else {

            const d = `(${str.includes('.') ? '[\\d.]': '\\d'}+)`;
            const months = /\dm\d.*[wdhm](\d|$)|month/i.test(str);
            const inputRegex = months ? new RegExp(`^(?:${d}(?:m|months?))?(?:${d}(?:w|weeks?))?(?:${d}(?:d|days?))?(?:${d}(?:h|hrs?|hours?))?(?:${d}(?:m|mins?|minutes?))?(?:${d}(?:s|secs?|seconds?))?$`) :
                new RegExp(`(?:${d}([a-z]+))`, 'g');

            str = str.replace(/ +/g, '')
                .toLowerCase();
            let m = inputRegex.exec(str);

            if (!m) throw 'Invalid Input'

            let s = 0
            const times = [2.592e+6, 604800, 86400, 3600, 60, 1];

            if (months) m.slice(1)
                .forEach((x, i) => x && (s += (times[i] * x) | 0));
            else {
                const names = ['week', 'day', ['hr', 'hour'], 'minute', 'second'];
                const groups = m.slice(1);
                while (m = inputRegex.exec(str)) groups.push(...m.slice(1));

                for (var i = 0; i < groups.length; i += 2) {
                    const index = names.findIndex(x => Array.isArray(x) ? x.find(r => r.startsWith(groups[i + 1])) : x.startsWith(groups[i + 1]));
                    if (index === -1) throw `Invalid time value: ${groups[i + 1]}`;
                    s += times[index + 1] * groups[i];
                }
            }

            if (s < 0) throw 'Time value too large'
            return new Date(startTime + s * 1000);

        }
    }, 

    clean: (text) => {
        if (typeof(text) === "string") return text.replace(/`/g, "`" + String.fromCharCode(8203))
            .replace(/@/g, "@" + String.fromCharCode(8203));
        else return text;
    },

    prettyms: (milliseconds, options = {}) => {
        if (!Number.isFinite(milliseconds)) {
            throw new TypeError('Expected a finite number');
        }

        if (options.colonNotation) {
            options.compact = false;
            options.formatSubMilliseconds = false;
            options.separateMilliseconds = false;
            options.verbose = false;
        }

        if (options.compact) {
            options.secondsDecimalDigits = 0;
            options.millisecondsDecimalDigits = 0;
        }

        const result = [];

        const add = (value, long, short, valueString) => {
            if ((result.length === 0 || !options.colonNotation) && value === 0 && !(options.colonNotation && short === 'm')) {
                return;
            }

            valueString = (valueString || value || '0')
                .toString();
            let prefix;
            let suffix;
            if (options.colonNotation) {
                prefix = result.length > 0 ? ':' : '';
                suffix = '';
                const wholeDigits = valueString.includes('.') ? valueString.split('.')[0].length : valueString.length;
                const minLength = result.length > 0 ? 2 : 1;
                valueString = '0'.repeat(Math.max(0, minLength - wholeDigits)) + valueString;
            } else {
                prefix = '';
                suffix = options.verbose ? ' ' + pluralize(long, value) : short;
            }

            result.push(prefix + valueString + suffix);
        };

        const secondsDecimalDigits =
            typeof options.secondsDecimalDigits === 'number' ?
            options.secondsDecimalDigits :
            1;

        if (secondsDecimalDigits < 1) {
            const difference = 1000 - (milliseconds % 1000);
            if (difference < 500) {
                milliseconds += difference;
            }
        }

        // Round up milliseconds for values lager than 1 minute - 50ms since these
        // always need to be round up. This fixes issues when rounding seconds
        // independently of minutes later on.
        if (
            milliseconds >= (1000 * 60) - 50 &&
            !options.separateMilliseconds &&
            !options.formatSubMilliseconds
        ) {
            const difference = 60 - (milliseconds % 60);
            if (difference <= 50) {
                milliseconds += difference;
            }
        }

        const parsed = module.exports.parsems(milliseconds);

        add(Math.trunc(parsed.days / 365), 'year', 'y');
        add(parsed.days % 365, 'day', 'd');
        add(parsed.hours, 'hour', 'h');
        add(parsed.minutes, 'minute', 'm');

        if (
            options.separateMilliseconds ||
            options.formatSubMilliseconds ||
            milliseconds < 1000
        ) {
            add(parsed.seconds, 'second', 's');
            if (options.formatSubMilliseconds) {
                add(parsed.milliseconds, 'millisecond', 'ms');
                add(parsed.microseconds, 'microsecond', 'µs');
                add(parsed.nanoseconds, 'nanosecond', 'ns');
            } else {
                const millisecondsAndBelow =
                    parsed.milliseconds +
                    (parsed.microseconds / 1000) +
                    (parsed.nanoseconds / 1e6);

                const millisecondsDecimalDigits =
                    typeof options.millisecondsDecimalDigits === 'number' ?
                    options.millisecondsDecimalDigits :
                    0;

                const roundedMiliseconds = millisecondsAndBelow >= 1 ?
                    Math.round(millisecondsAndBelow) :
                    Math.ceil(millisecondsAndBelow);

                const millisecondsString = millisecondsDecimalDigits ?
                    millisecondsAndBelow.toFixed(millisecondsDecimalDigits) :
                    roundedMiliseconds;

                add(
                    parseFloat(millisecondsString, 10),
                    'millisecond',
                    'ms',
                    millisecondsString
                );
            }
        } else {
            const seconds = (milliseconds / 1000) % 60;
            const secondsDecimalDigits =
                typeof options.secondsDecimalDigits === 'number' ?
                options.secondsDecimalDigits :
                1;
            const secondsFixed = seconds.toFixed(secondsDecimalDigits);
            const secondsString = options.keepDecimalsOnWholeSeconds ?
                secondsFixed :
                secondsFixed.replace(/\.0+$/, '');
            add(parseFloat(secondsString, 10), 'second', 's', secondsString);
        }

        if (result.length === 0) {
            return '0' + (options.verbose ? ' milliseconds' : 'ms');
        }

        if (options.compact) {
            return result[0];
        }

        if (typeof options.unitCount === 'number') {
            const separator = options.colonNotation ? '' : ' ';
            return result.slice(0, Math.max(options.unitCount, 1))
                .join(separator);
        }

        return options.colonNotation ? result.join('') : result.join(' ');
    },

    parsems: (milliseconds) => {
        if (typeof milliseconds !== 'number') {
            throw new TypeError('Expected a number');
        }
    
        const roundTowardsZero = milliseconds > 0 ? Math.floor : Math.ceil;
    
        return {
            days: roundTowardsZero(milliseconds / 86400000),
            hours: roundTowardsZero(milliseconds / 3600000) % 24,
            minutes: roundTowardsZero(milliseconds / 60000) % 60,
            seconds: roundTowardsZero(milliseconds / 1000) % 60,
            milliseconds: roundTowardsZero(milliseconds) % 1000,
            microseconds: roundTowardsZero(milliseconds * 1000) % 1000,
            nanoseconds: roundTowardsZero(milliseconds * 1e6) % 1000
        };
    }

}


System.register(["stream"], function (exports_1, context_1) {
    "use strict";
    var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var stream_1, ResultStream;
    /*
     * Copyright (c) 2018 Bob Kerns.
     */
    "use Strict";
    var __moduleName = context_1 && context_1.id;
    function resultStream(result) {
        return new ResultStream({ result });
    }
    exports_1("resultStream", resultStream);
    return {
        setters: [
            function (stream_1_1) {
                stream_1 = stream_1_1;
            }
        ],
        execute: function () {
            /**
             * A stream of results from the database.
             */
            ResultStream = class ResultStream extends stream_1.Readable {
                constructor(options) {
                    super({ objectMode: true });
                    this.result = options.result;
                    let stream = this;
                    let summary_ok, summary_err, data_err;
                    this.summary = new Promise((accept, reject) => {
                        summary_ok = accept;
                        summary_err = reject;
                    }).then((summary) => {
                        this.push(null);
                        return summary;
                    });
                    function wait() {
                        return new Promise((accept, reject) => {
                            stream.continue = accept;
                            data_err = reject;
                        });
                    }
                    this.result.subscribe({
                        onNext(record) {
                            stream.reading.then(() => {
                                if (!stream.push(record)) {
                                    stream.reading = wait();
                                }
                            });
                            return stream.reading;
                        },
                        onCompleted(summary) {
                            return __awaiter(this, void 0, void 0, function* () {
                                // We have to wait for any pending reading to finish.
                                yield stream.reading;
                                summary_ok(summary);
                            });
                        },
                        onError(error) {
                            stream.emit('error', error);
                        }
                    });
                    this.reading = wait();
                    this.on('error', (e) => {
                        summary_err(e);
                        data_err(e);
                    });
                }
                _read() {
                    this.continue(undefined);
                }
            };
            exports_1("ResultStream", ResultStream);
        }
    };
});
//# sourceMappingURL=result-stream.js.map
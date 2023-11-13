import InputPopup from './InputPopup';
import * as tf from '@tensorflow/tfjs';
import VideoUtils from '../../util/videoUtils';
import MediaPipeUtils from '../../util/mediaPipeUtils';
const mediaPipeUtils = MediaPipeUtils.getInstance();
export const classes = [
    'ai_learning_image'
];
const SCALAR_VALUE = 127.5;
const SIZE = 224;
class ImageLearning {
    #type = null;
    #url = '';
    #labels = [];
    #popup = null;
    #result = [];
    #axis = 0;
    #isPredicting = false;
    #captureCanvas;
    #captureTimeoutClear;
    constructor({ url, labels, type }) {
        this.#type = type;
        this.#url = url;
        this.#labels = labels;
        this.load(`/uploads/${url}/model.json`);
        Entry.addEventListener('stop', () => {
            this.#result = [];
            this.#isPredicting = false;
        });
        if (!isWebGlSupport()) {
            tf.setBackend('cpu');
        }
    }

    getResult(index) {
        const result = this.#result.length ? this.#result : this.#popup?.result || [];
        const defaultResult = { probability: 0, className: '' };
        if (index !== undefined && index > -1) {
            return (
                result.find(({ className }) => className === this.#labels[index]) || defaultResult
            );
        }
        return result[0] || defaultResult;
    }

    unbanBlocks(blockMenu) {
        blockMenu.unbanClass(`ai_learning_classification`);
        if (this.#type) {
            blockMenu.unbanClass(`ai_learning_${this.#type}`);
        }
    }

    openInputPopup() {
        this.#popup = new InputPopup({
            url: this.#url,
            labels: this.#labels,
            type: this.#type,
        });
        this.#popup.open();
    }

    getVideo() {
        if (VideoUtils.isInitialized) {
            return VideoUtils.video;
        }
        if (mediaPipeUtils.isInitialized) {
            return mediaPipeUtils.video;
        }
        return null;
    }
    async startPredict() {
        if (!this.isLoaded || this.#isPredicting) {
            return false;
        }

        this.#isPredicting = true;
        if (!this.captureCanvas) {
            this.#captureCanvas = document.createElement('canvas');
            this.#captureCanvas.width = SIZE;
            this.#captureCanvas.height = SIZE;
        }

        this.#captureTimeoutClear = Entry.Utils.asyncAnimationFrame(async () => {
            const video = this.getVideo();
            if (!video) {
                return;
            }
            const context = this.#captureCanvas.getContext('2d');
            context.drawImage(video, 0, 0, SIZE, SIZE);

            tf.engine().startScope();
            const tensor = await this.preprocess(this.#captureCanvas);
            const logits = this.model.predict(tensor);
            this.#result = await this.namePredictions(logits);
            logits.dispose();
            tf.engine().endScope();
        });

        return this.#result;
    }

    stopPredict() {
        this.#result = [];
        this.#isPredicting = false;
        this.#captureTimeoutClear && this.#captureTimeoutClear();
    }

    async namePredictions(logits) {
        const values = Array.from(await logits.data());
        return values
            .map((probability, index) => ({
                className: this.#labels[index] || index,
                probability,
            }))
            .sort((a, b) => a.probability > b.probability ? -1 : a.probability < b.probability ? 1 : 0);
    }

    async preprocess(canvas) {
        return tf.tidy(() => {
            const offset = tf.scalar(SCALAR_VALUE);
            return tf.browser
                .fromPixels(canvas)
                .toFloat()
                .sub(offset)
                .div(offset)
                .expandDims(this.#axis);
        });
    }

    async load(url) {
        this.model = await tf.loadLayersModel(url);
        this.isLoaded = true;
    }
}

export default ImageLearning;

function isWebGlSupport() {
    try {
        const currentCanvas = document.createElement('canvas');
        return !!currentCanvas.getContext('webgl', { premultipliedalpha: false });
    } catch (e) {
        console.log('error', e);
        return false;
    }
}

'use strict';

const hardware = require('./hardware/index');
const hardwareLite = require('./hardwareLite/index');
const _union = require('lodash/union');
const _flatten = require('lodash/flatten');

const basicBlockList = [
    require('./block_start'),
    require('./block_flow'),
    require('./block_moving'),
    require('./block_looks'),
    require('./block_brush'),
    require('./block_text'),
    require('./block_sound'),
    require('./block_judgement'),
    require('./block_calc'),
    require('./block_variable'),
    require('./block_func'),
    require('./block_ai'),
    require('./block_analysis'),
    require('./block_ai_learning'),
    require('./block_ai_learning_knn'),
    require('./block_ai_learning_cluster'),
    require('./block_ai_learning_regression'),
    require('./block_ai_learning_logistic_regression'),
    require('./block_ai_learning_decisiontree'),
    require('./block_ai_learning_svm'),
    require('./block_ai_utilize_media_pipe'),
];

Entry.AI_UTILIZE_BLOCK = {};
require('./block_ai_utilize_audio');
require('./block_ai_utilize_tts');
require('./block_ai_utilize_translate');
require('./block_ai_utilize_video');
require('./block_ai_utilize_gesture_recognition');
require('./block_ai_utilize_pose_landmarker');
require('./block_ai_utilize_face_landmarker');
require('./block_ai_utilize_object_detector');
Entry.AI_UTILIZE_BLOCK_LIST = {
    audio: Entry.AI_UTILIZE_BLOCK.audio,
    tts: Entry.AI_UTILIZE_BLOCK.tts,
    translate: Entry.AI_UTILIZE_BLOCK.translate,
    poseLandmarker: Entry.AI_UTILIZE_BLOCK.poseLandmarker,
    faceLandmarker: Entry.AI_UTILIZE_BLOCK.faceLandmarker,
    objectDetector: Entry.AI_UTILIZE_BLOCK.objectDetector,
    gestureRecognition: Entry.AI_UTILIZE_BLOCK.gestureRecognition,
};

Entry.AI_UTILIZE_BLOCK_LIST_DEPRECATED = {
    video: Entry.AI_UTILIZE_BLOCK.video,
};

Entry.ALL_AI_UTILIZE_BLOCK_LIST = {
    audio: Entry.AI_UTILIZE_BLOCK.audio,
    tts: Entry.AI_UTILIZE_BLOCK.tts,
    translate: Entry.AI_UTILIZE_BLOCK.translate,
    poseLandmarker: Entry.AI_UTILIZE_BLOCK.poseLandmarker,
    faceLandmarker: Entry.AI_UTILIZE_BLOCK.faceLandmarker,
    objectDetector: Entry.AI_UTILIZE_BLOCK.objectDetector,
    gestureRecognition: Entry.AI_UTILIZE_BLOCK.gestureRecognition,
    video: Entry.AI_UTILIZE_BLOCK.video,
};

Entry.EXPANSION_BLOCK = {};
require('./block_expansion_weather');
require('./block_expansion_festival');
require('./block_expansion_behaviorconduct_disaster');
require('./block_expansion_behaviorconduct_lifesafety');

Entry.EXPANSION_BLOCK_LIST = {
    weather: Entry.Expansion_Weather,
    festival: Entry.EXPANSION_BLOCK.festival,
    behaviorConductDisaster: Entry.EXPANSION_BLOCK.behaviorConductDisaster,
    behaviorConductLifeSafety: Entry.EXPANSION_BLOCK.behaviorConductLifeSafety,
};

const destroyBlockList = [];

function getBlockObject(items) {
    const blockObject = {};
    items.forEach((item) => {
        try {
            if ('getBlocks' in item) {
                Object.assign(blockObject, item.getBlocks());
            }
            if ('destroy' in item) {
                destroyBlockList.push(item.destroy);
            }
        } catch (err) {
            console.log(err, item);
        }
    });
    return blockObject;
}

function getHardwareBlockObject(items) {
    const blockObject = {};
    items.forEach((item) => {
        // 일반모드, 교과블록 미포함 하드웨어 > 일반블록만 출력
        // 일반모드, 교과블록 포함 하드웨어 > 일반블록만 출력
        // 교과모드, 교과블록 미포함 하드웨어 > 일반블록만 출력
        // 교과모드, 교과블록 포함 하드웨어 > 교과블록만 출력
        try {
            if (item.hasPracticalCourse && EntryStatic.isPracticalCourse) {
                Object.assign(
                    blockObject,
                    'getPracticalBlocks' in item ? item.getPracticalBlocks() : {}
                );
                EntryStatic.hwMiniSupportList.push(item.name);
            } else {
                Object.assign(blockObject, 'getBlocks' in item ? item.getBlocks() : {});
            }
        } catch (err) {
            console.log(err, item);
        }
    });
    return blockObject;
}

/**
 * 하드웨어 블록을 EntryStatic 에 등록한다.
 * 하드웨어 블록에만 사용하는 이유는,
 * 기존 블록은 legacy 블록이 존재하기 때문에 전부 등록하면 안되기 때문이다.
 * 또한 값블록으로서만 사용하는 블록이 블록메뉴에 따로 나타나게 될 수 있다.
 *
 * @param {Object} hardwareModules
 * @return {void}
 */
function registerHardwareBlockToStatic(hardwareModules) {
    // TODO : getHardwareBlockObject과의 병합 고려
    hardwareModules.forEach((hardware) => {
        try {
            if (hardware.hasPracticalCourse && EntryStatic.isPracticalCourse) {
                if (hardware.practicalBlockMenuBlocks) {
                    for (let category in hardware.practicalBlockMenuBlocks) {
                        EntryStatic.DynamicPracticalHardwareBlocks[category] = _union(
                            hardware.practicalBlockMenuBlocks[category],
                            EntryStatic.DynamicPracticalHardwareBlocks[category]
                        );
                    }
                }
            } else {
                EntryStatic.DynamicHardwareBlocks = _union(
                    hardware.blockMenuBlocks || [],
                    EntryStatic.DynamicHardwareBlocks
                );
            }
        } catch (err) {
            console.log(err, hardware);
        }
    });
}

module.exports = {
    getBlocks() {
        const hardwareModules = hardware.getHardwareModuleList();
        const hardwareLiteModules = hardwareLite.getHardwareLiteModuleList();
        registerHardwareBlockToStatic(hardwareModules);
        registerHardwareBlockToStatic(hardwareLiteModules);
        const basicAndExpansionBlockObjectList = getBlockObject(
            basicBlockList
                .concat(Object.values(Entry.EXPANSION_BLOCK_LIST))
                .concat(Object.values(Entry.ALL_AI_UTILIZE_BLOCK_LIST))
        );
        const hardwareBlockObjectList = getHardwareBlockObject(hardwareModules);
        const hardwareLiteBlockObjectList = getHardwareBlockObject(hardwareLiteModules);
        return Object.assign(
            {},
            basicAndExpansionBlockObjectList,
            hardwareBlockObjectList,
            hardwareLiteBlockObjectList
        );
    },
    destroyBlockList,
};

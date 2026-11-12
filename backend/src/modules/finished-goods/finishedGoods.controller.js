import {
    createFinishedGoodsLot,
    releaseFinishedGoodsLot,
    listFinishedGoods,
    getFinishedGoodsLot,
    createFinishedGoodsFromBMR,
} from "./finishedGoods.service.js"


export const createFinishedGoodsLotController = async (req, res, next) => {
  try {
    const lot = await createFinishedGoodsLot(
      req.body.productionBatchId,
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: "Finished-goods lot created and held pending release",
      data: lot,
    });
  } catch (error) {
    next(error);
  }
};

export const releaseFinishedGoodsLotController = async (req, res, next) => {
  try {
    const lot = await releaseFinishedGoodsLot(
      req.params.id,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: "Finished-goods lot released successfully",
      data: lot,
    });
  } catch (error) {
    next(error);
  }
};

export const listFinishedGoodsController = async (req, res, next) => {
  try {
    const lots = await listFinishedGoods(req.query);

    res.status(200).json({
      success: true,
      count: lots.length,
      data: lots,
    });
  } catch (error) {
    next(error);
  }
};

export const getFinishedGoodsLotController = async (req, res, next) => {
  try {
    const lot = await getFinishedGoodsLot(req.params.id);

    res.status(200).json({
      success: true,
      data: lot,
    });
  } catch (error) {
    next(error);
  }
};

export const createFinishedGoodsFromBMRController = async (req, res, next) => {
  try {
    const lot = await createFinishedGoodsFromBMR(req.validated.body, req.user.id);

    res.status(201).json({
      success: true,
      message: "Finished-goods lot created from BMR. Pending release — Quality In-charge must approve before dispatch.",
      data: lot,
    });
  } catch (error) {
    next(error);
  }
};

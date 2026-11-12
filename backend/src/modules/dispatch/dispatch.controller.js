import {
    createDispatch,
    confirmDispatch,
    cancelDispatch,
    listDispatches,
    getDispatch,
    directDispatch,
} from "./dispatch.service.js"


export const createDispatchController = async (req, res, next) => {
  try {
    const dispatch = await createDispatch(req.body, req.user.id);

    res.status(201).json({
      success: true,
      message: "Dispatch created and stock reserved successfully",
      data: dispatch,
    });
  } catch (error) {
    next(error);
  }
};

export const confirmDispatchController = async (req, res, next) => {
  try {
    const dispatch = await confirmDispatch(
      req.params.id,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: "Dispatch confirmed successfully",
      data: dispatch,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelDispatchController = async (req, res, next) => {
  try {
    const dispatch = await cancelDispatch(
      req.params.id,
      req.user.id,
      req.body.reason
    );

    res.status(200).json({
      success: true,
      message: "Dispatch cancelled and reservation released",
      data: dispatch,
    });
  } catch (error) {
    next(error);
  }
};

export const listDispatchesController = async (req, res, next) => {
  try {
    const dispatches = await listDispatches(req.query);

    res.status(200).json({
      success: true,
      count: dispatches.length,
      data: dispatches,
    });
  } catch (error) {
    next(error);
  }
};

export const getDispatchController = async (req, res, next) => {
  try {
    const dispatch = await getDispatch(req.params.id);

    res.status(200).json({
      success: true,
      data: dispatch,
    });
  } catch (error) {
    next(error);
  }
};

export const directDispatchController = async (req, res, next) => {
  try {
    const dispatch = await directDispatch(req.validated.body, req.user.id);

    res.status(201).json({
      success: true,
      message: "Dispatch created successfully. Stock has been deducted from finished goods.",
      data: dispatch,
    });
  } catch (error) {
    next(error);
  }
};

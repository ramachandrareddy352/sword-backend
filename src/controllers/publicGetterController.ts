import type { Request, Response } from "express";
import prisma from "../database/client.ts";
import { getPagination } from "../services/queryHelpers.ts";
import { serializeBigInt } from "../services/serializeBigInt.ts";

// 1. GET /public/swords - All sword definitions
export const getAllSwords = async (req: Request, res: Response) => {
  try {
    const {
      sortLevel, // 'asc' | 'desc'
      sortPower, // 'asc' | 'desc'
      sortUpgradeCost, // 'asc' | 'desc'
      sortSellingCost, // 'asc' | 'desc'
      sortCreatedAt, // 'asc' | 'desc'
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(200).json({
        success: true,
        message: "No swords found for in the game",
        swords: [],
        total: 0,
        page: Number(req.query.page || 0),
        limit: Number(req.query.limit || 20),
      });
    }

    // Build orderBy array dynamically
    const orderBy: any[] = [];

    if (sortLevel && ["asc", "desc"].includes(sortLevel as string)) {
      orderBy.push({ level: sortLevel });
    }
    if (sortPower && ["asc", "desc"].includes(sortPower as string)) {
      orderBy.push({ power: sortPower });
    }
    if (
      sortUpgradeCost &&
      ["asc", "desc"].includes(sortUpgradeCost as string)
    ) {
      orderBy.push({ upgradeCost: sortUpgradeCost });
    }
    if (
      sortSellingCost &&
      ["asc", "desc"].includes(sortSellingCost as string)
    ) {
      orderBy.push({ sellingCost: sortSellingCost });
    }
    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ createdAt: sortCreatedAt });
    }

    // Default sort if nothing provided
    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

    const total = await prisma.swordLevelDefinition.count();

    const swords = await prisma.swordLevelDefinition.findMany({
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
      select: {
        id: true,
        level: true,
        name: true,
        image: true,
        description: true,
        upgradeCost: true,
        sellingCost: true,
        successRate: true,
        power: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (swords.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No swords found in the game",
        swords: [],
        total,
        page: pagination.page,
        limit: pagination.limit,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Swords fetched successfully",
      swords: serializeBigInt(swords),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (error) {
    console.error("getAllSwords error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 2. GET /public/materials - All material types
export const getAllMaterials = async (req: Request, res: Response) => {
  try {
    const {
      sortCost, // 'asc' | 'desc'
      sortPower, // 'asc' | 'desc'
      sortCode, // 'asc' | 'desc'
      sortCreatedAt, // 'asc' | 'desc'
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(200).json({
        success: true,
        message: "No materials found for  in the game",
        materials: [],
        total: 0,
        page: Number(req.query.page || 0),
        limit: Number(req.query.limit || 20),
      });
    }

    const orderBy: any[] = [];

    if (sortCost && ["asc", "desc"].includes(sortCost as string)) {
      orderBy.push({ cost: sortCost });
    }
    if (sortPower && ["asc", "desc"].includes(sortPower as string)) {
      orderBy.push({ power: sortPower });
    }
    if (sortCode && ["asc", "desc"].includes(sortCode as string)) {
      orderBy.push({ code: sortCode });
    }
    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ createdAt: sortCreatedAt });
    }

    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

    const total = await prisma.materialType.count();

    const materials = await prisma.materialType.findMany({
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        image: true,
        cost: true,
        power: true,
        rarity: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (materials.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No materials found in the game",
        materials: [],
        total,
        page: pagination.page,
        limit: pagination.limit,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Materials fetched successfully",
      materials,
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (error) {
    console.error("getAllMaterials error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 3. GET /public/shields - All shield types
export const getAllShields = async (req: Request, res: Response) => {
  try {
    const {
      sortCost, // 'asc' | 'desc'
      sortPower, // 'asc' | 'desc'
      sortCode, // 'asc' | 'desc'
      sortCreatedAt, // 'asc' | 'desc'
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(200).json({
        success: true,
        message: "No shields found for in the game",
        shields: [],
        total: 0,
        page: Number(req.query.page || 0),
        limit: Number(req.query.limit || 20),
      });
    }

    const orderBy: any[] = [];

    if (sortCost && ["asc", "desc"].includes(sortCost as string)) {
      orderBy.push({ cost: sortCost });
    }
    if (sortPower && ["asc", "desc"].includes(sortPower as string)) {
      orderBy.push({ power: sortPower });
    }
    if (sortCode && ["asc", "desc"].includes(sortCode as string)) {
      orderBy.push({ code: sortCode });
    }
    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ createdAt: sortCreatedAt });
    }

    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

    const total = await prisma.shieldType.count();

    const shields = await prisma.shieldType.findMany({
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        image: true,
        cost: true,
        power: true,
        rarity: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (shields.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No shields found in the game",
        shields: [],
        total,
        page: pagination.page,
        limit: pagination.limit,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Shields fetched successfully",
      shields,
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (error) {
    console.error("getAllShields error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 4. GET /public/sword - Single sword by level or name
export const getSword = async (req: Request, res: Response) => {
  try {
    const { level, name } = req.query;

    if (!level && !name) {
      return res.status(400).json({
        success: false,
        error: "Provide either 'level' or 'name' query parameter",
      });
    }

    let sword;
    if (level) {
      sword = await prisma.swordLevelDefinition.findUnique({
        where: { level: Number(level) },
        select: {
          id: true,
          level: true,
          name: true,
          image: true,
          description: true,
          upgradeCost: true,
          sellingCost: true,
          successRate: true,
          power: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } else if (name) {
      sword = await prisma.swordLevelDefinition.findUnique({
        where: { name: name as string },
        select: {
          id: true,
          level: true,
          name: true,
          image: true,
          description: true,
          upgradeCost: true,
          sellingCost: true,
          successRate: true,
          power: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    if (!sword) {
      return res
        .status(404)
        .json({ success: false, error: "Sword not found in the game" });
    }

    return res.status(200).json({
      success: true,
      message: "Sword fetched successfully",
      sword: serializeBigInt(sword),
    });
  } catch (error) {
    console.error("getSword error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 5. GET /public/material - Single material by id, code or name
export const getMaterial = async (req: Request, res: Response) => {
  try {
    const { id, code, name } = req.query;

    if (!id && !code && !name) {
      return res.status(400).json({
        success: false,
        error: "Provide 'id', 'code' or 'name' query parameter",
      });
    }

    let material;
    if (id) {
      material = await prisma.materialType.findUnique({
        where: { id: BigInt(id as string) },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          image: true,
          cost: true,
          power: true,
          rarity: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } else if (code) {
      material = await prisma.materialType.findUnique({
        where: { code: code as string },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          image: true,
          cost: true,
          power: true,
          rarity: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } else if (name) {
      material = await prisma.materialType.findUnique({
        where: { name: name as string },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          image: true,
          cost: true,
          power: true,
          rarity: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    if (!material) {
      return res
        .status(404)
        .json({ success: false, error: "Material not found in the game" });
    }

    return res.status(200).json({
      success: true,
      message: "Material fetched successfully",
      material,
    });
  } catch (error) {
    console.error("getMaterial error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 6. GET /public/shield - Single shield by id, code or name
export const getShield = async (req: Request, res: Response) => {
  try {
    const { id, code, name } = req.query;

    if (!id && !code && !name) {
      return res.status(400).json({
        success: false,
        error: "Provide 'id', 'code' or 'name' query parameter",
      });
    }

    let shield;
    if (id) {
      shield = await prisma.shieldType.findUnique({
        where: { id: BigInt(id as string) },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          image: true,
          cost: true,
          power: true,
          rarity: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } else if (code) {
      shield = await prisma.shieldType.findUnique({
        where: { code: code as string },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          image: true,
          cost: true,
          power: true,
          rarity: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } else if (name) {
      shield = await prisma.shieldType.findUnique({
        where: { name: name as string },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          image: true,
          cost: true,
          power: true,
          rarity: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    if (!shield) {
      return res
        .status(404)
        .json({ success: false, error: "Shield not found in the game" });
    }

    return res.status(200).json({
      success: true,
      message: "Shield fetched successfully",
      shield,
    });
  } catch (error) {
    console.error("getShield error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

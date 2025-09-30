import mongoose from "mongoose";
import Order from "../models/Order.js";

function normalizeItem(raw) {
  const sku = typeof raw?.sku === "string" ? raw.sku.trim() : "";
  const title = typeof raw?.title === "string" ? raw.title.trim() : "";
  const qtyRaw = Number(raw?.qty ?? raw?.quantity);
  const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.round(qtyRaw) : NaN;
  const priceRaw = Number(raw?.price ?? raw?.precio);
  const price = Number.isFinite(priceRaw) && priceRaw >= 0 ? priceRaw : NaN;

  if (!title || Number.isNaN(qty) || Number.isNaN(price)) {
    return null;
  }

  const subtotal = qty * price;

  return {
    sku: sku || undefined,
    title,
    qty,
    price,
    subtotal,
  };
}

function computeTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
  const units = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  return {
    items: units,
    subtotal,
    total: subtotal,
    currency: "CLP",
  };
}

function normalizeCustomer(body) {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const rut = typeof body?.rut === "string" ? body.rut.trim().toUpperCase() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const documentTypeRaw = typeof body?.documentType === "string" ? body.documentType.trim().toLowerCase() : "";
  const documentType = ["boleta", "factura"].includes(documentTypeRaw) ? documentTypeRaw : "boleta";

  return {
    name,
    rut,
    phone,
    email,
    documentType,
  };
}

function normalizeDelivery(methodRaw, addressRaw) {
  const method = typeof methodRaw === "string" ? methodRaw.trim().toLowerCase() : "";
  const normalizedMethod = ["retiro", "despacho"].includes(method) ? method : "retiro";
  const address = normalizedMethod === "despacho" && typeof addressRaw === "string" ? addressRaw.trim() : "";
  return {
    method: normalizedMethod,
    address,
  };
}

export async function createOrder(req, res) {
  try {
    const items = Array.isArray(req.body?.items)
      ? req.body.items.map(normalizeItem).filter(Boolean)
      : [];

    if (!items.length) {
      return res.status(400).json({ error: "Items inválidos" });
    }

    const customer = normalizeCustomer(req.body?.customer ?? req.body);
    if (!customer.name || !customer.rut || !customer.phone) {
      return res.status(400).json({ error: "Datos del cliente incompletos" });
    }

    const delivery = normalizeDelivery(req.body?.deliveryMethod, req.body?.address ?? req.body?.delivery?.address);
    if (delivery.method === "despacho" && !delivery.address) {
      return res.status(400).json({ error: "Dirección requerida para despacho" });
    }

    const totals = computeTotals(items);
    const meta = {
      source: typeof req.body?.source === "string" ? req.body.source : "web",
      raw: req.body,
    };
    const orderId = req.body?.orderId;
    let order = null;
    if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
      order = await Order.findByIdAndUpdate(
        orderId,
        {
          $set: {
            status: "pending",
            items,
            totals,
            customer,
            delivery,
            documentType: customer.documentType,
            meta,
            updatedAt: new Date(),
          },
          $unset: { lines: 1, total: 1, currency: 1 },
        },
        { new: true }
      );
    }

    if (!order) {
      order = await Order.create({
        status: "pending",
        items,
        totals,
        customer,
        delivery,
        documentType: customer.documentType,
        meta,
      });
    }

    return res.status(201).json({
      orderId: order._id.toString(),
      totals: order.totals,
      customer: order.customer,
      delivery: order.delivery,
      status: order.status,
    });
  } catch (error) {
    console.error("createOrder error", error);
    return res.status(500).json({ error: "Error creando la orden" });
  }
}

export async function listOrders(req, res) {
  try {
    const { search } = req.query;
    const filter = {};
    if (search) {
      const term = String(search).trim();
      if (mongoose.Types.ObjectId.isValid(term)) {
        filter._id = term;
      } else {
        filter.$or = [
          { "customer.rut": new RegExp(term, "i") },
          { "customer.name": new RegExp(term, "i") },
          { "items.sku": new RegExp(term, "i") },
        ];
      }
    }

    const limit = Math.min(parseInt(req.query?.limit, 10) || 100, 500);
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const payload = orders.map((order) => ({
      id: order._id,
      status: order.status,
      totals: order.totals,
      customer: order.customer,
      delivery: order.delivery,
      documentType: order.documentType,
      items: order.items,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));

    return res.json(payload);
  } catch (error) {
    console.error("listOrders error", error);
    return res.status(500).json({ error: "Error obteniendo órdenes" });
  }
}

const { describe, it, beforeEach, afterEach } = require("mocha");
const CarService = require("../../src/service/carService");
const Transaction = require("../../src/entities/transaction");
const { join } = require("path");
const assert = require("assert");
const { expect } = require("chai");
const sinon = require("sinon");
const carsDatabase = join(__dirname, "./../../database", "cars.json");

const mocks = {
  validCarCategory: require("./../mocks/valid-carCategory.json"),
  validCar: require("./../mocks/valid-car.json"),
  validCustomer: require("./../mocks/valid-customer.json"),
};

describe("CarService Suite Tests", () => {
  let carService = {};
  let sandbox = {};

  before(() => {
    carService = new CarService({ cars: carsDatabase });
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should return a list of cars", async () => {
    // Test implementation will go here
    const result = await carService.getAllCars();
    const expectedResult = [
      {
        id: "0c006318-c523-40a4-abe2-b7457cb697c4",
        name: "A4",
        releaseYear: 2025,
        available: true,
        gasAvailable: true,
      },
      {
        id: "94dfadfa-66c3-4256-88c2-cf3f5294226a",
        name: "Sentra",
        releaseYear: 2025,
        available: false,
        gasAvailable: true,
      },
    ];

    assert.deepStrictEqual(result, expectedResult);
  });

  it("should retrieve a random position from array", () => {
    const data = [0, 1, 2, 3, 4];
    const result = carService.getRandomPositionFromArray(data);

    expect(result).to.be.lte(data.length).and.be.gte(0);
  });

  it("should choose the first id from carIds in carCategory", () => {
    const carIdIndex = 0;
    const carCategory = mocks.validCarCategory;
    const expected = carCategory[carIdIndex].carIds[0];

    const result = carService.chooseRandomCar(carCategory);

    expect(result).to.be.oneOf(carCategory[0].carIds);
  });

  it("should choose the first id from the carIds in carCategory with stubs", () => {
    const carCategory = mocks.validCarCategory;
    const carIdIndex = 1;

    sandbox
      .stub(carService, carService.getRandomPositionFromArray.name)
      .returns(carIdIndex);

    const result = carService.chooseRandomCar(carCategory);
    const expected = carCategory[0].carIds[carIdIndex];

    expect(result).to.be.equal(expected);
    expect(carService.getRandomPositionFromArray.calledOnce).to.be.ok;
  });

  it("given a carCategory, it should return an available car", async () => {
    const car = mocks.validCar;

    // cloning the car category and setting the car id
    const carCategory = Object.create(mocks.validCarCategory);
    carCategory.ids = [car.id];

    sandbox
      .stub(carService.carRepository, carService.carRepository.find.name)
      .resolves(car);

    sandbox.spy(carService, carService.chooseRandomCar.name);

    const result = await carService.getAvailableCar(carCategory);

    expect(carService.chooseRandomCar.calledOnce).to.be.ok;
    // expect(carService.carRepository.find.calledWithExactly(car.id)).to.be.ok;
    expect(result).to.be.deep.equal(car);
  });

  it("given a carCategory customer and numberOfDays it should calculate final amount in BRL", async () => {
    const customer = Object.create(mocks.validCustomer);
    customer.age = 50;

    const carCategory = Object.create(mocks.validCarCategory);
    carCategory.price = 37.6;

    const numberOfDays = 5;

    sandbox
      .stub(carService, "taxesBasedOnAge")
      .get(() => [{ from: 40, to: 50, then: 1.3 }]);

    const expected = carService.currencyFormat.format(244.4);
    const result = carService.calculateFinalPrice(
      customer,
      carCategory,
      numberOfDays
    );

    expect(result).to.be.deep.equal(expected);
  });

  it("given a customer and a car category it should return a transaction receipt", async () => {
    const car = mocks.validCar;
    const carCategory = {
      ...mocks.validCarCategory,
      price: 37.6,
      carIds: [car.id],
    };

    const customer = Object.create(mocks.validCustomer);
    customer.age = 50;
    const numberOfDays = 5;
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + numberOfDays);

    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };

    const now = new Date(2026, 0, 15);
    sandbox.useFakeTimers(now.getTime());
    sandbox
      .stub(carService.carRepository, carService.carRepository.find.name)
      .resolves(car);

    const expectedAmount = carService.currencyFormat.format(244.4);
    const result = await carService.rent(customer, carCategory, numberOfDays);

    const expected = new Transaction({
      customer,
      car,
      dueDate: dueDate.toLocaleDateString("pt-br", options),
      amount: expectedAmount,
    });

    expect(result).to.be.deep.equal(expected);
  });
});

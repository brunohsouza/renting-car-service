const Transaction = require("../entities/transaction");
const BaseRepository = require("../repositories/base/base");
const Tax = require("./../entities/tax");

class CarService {
  constructor({ cars }) {
    this.carRepository = new BaseRepository(cars);

    this.currencyFormat = new Intl.NumberFormat("pt-br", {
      style: "currency",
      currency: "BRL",
    });

    this.taxesBasedOnAge = Tax.taxesBasedOnAge;
  }

  getAllCars() {
    return this.carRepository.find();
  }

  async getAvailableCar(carCategory) {
    const carId = this.chooseRandomCar(carCategory);

    return await this.carRepository.find(carId);
  }

  getRandomPositionFromArray(list) {
    const listLength = list.length;

    return Math.floor(Math.random() * listLength);
  }

  chooseRandomCar(carCategory) {
    const randomCarIndex = this.getRandomPositionFromArray(
      carCategory[0].carIds
    );
    const carId = carCategory[0].carIds[randomCarIndex];

    return carId;
  }

  calculateFinalPrice(customer, carCategory, numberOfDays) {
    const { age } = customer;
    const price = carCategory.price;
    const { then: tax } = this.taxesBasedOnAge.find(
      (tax) => age >= tax.from && age <= tax.to
    );

    const finalPrice = tax * price * numberOfDays;

    const formattedPrice = this.currencyFormat.format(finalPrice);

    return formattedPrice;
  }

  async rent(customer, carCategory, numberOfDays) {
    const car = await this.getAvailableCar(carCategory);
    const finalPrice = await this.calculateFinalPrice(
      customer,
      carCategory,
      numberOfDays
    );

    const today = new Date();
    today.setDate(today.getDate() + numberOfDays);
    const options = { year: "numeric", month: "long", day: "numeric" };
    const dueDate = today.toLocaleDateString("pt-br", options);
    const transaction = new Transaction({
      customer,
      dueDate,
      car,
      amount: finalPrice,
    });

    return transaction;
  }
}

module.exports = CarService;
